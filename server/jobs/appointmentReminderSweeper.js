const pool = require("../db");
const { createNotification } = require("../utils/notifications");
const { emitToUser, emitToDept } = require("../sockets");
const { formatTime12h: formatTime } = require("../utils/dateTime");
const {
  APPROVED_RESOLUTION_GRACE_MINUTES,
  AUTO_REJECTED_UNANSWERED,
  LEGACY_UNANSWERED_REASON,
  buildUnansweredRejectReason,
  buildNoActionsCancelReason,
  buildAutoResolutionNotifications,
} = require("../utils/appointmentAutoResolution");

// Both the T-10min "starts soon" reminder and past-due resolution run on this
// one-minute tick -- coarser would leave a past-due appointment showing as
// Pending/Approved for too long, and would be too slow for a 10-min lead.
const TICK_INTERVAL_MS = 60 * 1000;
const IMMINENT_LEAD_MINUTES = 10;
// First resolution pass shortly after boot, so a restart (or a Render
// wake-up) doesn't leave past-due appointments unresolved until the first
// tick. Small delay rather than immediate: the DB may still be finishing
// startup at the exact moment this module loads.
const BOOT_DELAY_MS = 10 * 1000;

// `appointment_date`/`appointment_time` and the window snapshots are Manila
// wall-clock values with no timezone, but NOW() is UTC (db.js keeps the
// connection at "Z" and the DB container has no TZ override) -- so every
// comparison below is against Manila-now via CONVERT_TZ, which needs no MySQL
// timezone tables when given numeric offsets.
const MANILA_NOW = "CONVERT_TZ(NOW(), '+00:00', '+08:00')";

// T-10min "your appointment is starting soon" reminder. Fires for BOTH
// 'pending' and 'approved' -- some professors approve at the time rather than
// in advance, so for a pending request this doubles as a nudge to act -- and
// notifies BOTH the student and the professor. Anchored to the CURRENT window
// start (snapshot, then live template), not appointment_time: that column
// keeps the original start forever (it feeds uq_active_booking), so after a
// professor moved the window the reminder used to fire at the old time.
// imminent_reminder_sent_at dedupes it; a window move resets that stamp (see
// PATCH /professor/availability/:id) so it re-fires for the new start.
async function sweepImminentAppointmentReminders() {
  try {
    const [due] = await pool.query(
      `SELECT a.appointment_id, a.student_id, a.faculty_id, a.appointment_date,
              COALESCE(a.window_start_snapshot, fda.start_time, a.appointment_time) AS start_time,
              a.location_snapshot
       FROM appointments a
       LEFT JOIN faculty_availability fda ON a.availability_id = fda.availability_id
       WHERE a.status IN ('pending', 'approved')
         AND a.imminent_reminder_sent_at IS NULL
         AND TIMESTAMP(a.appointment_date, COALESCE(a.window_start_snapshot, fda.start_time, a.appointment_time))
             BETWEEN ${MANILA_NOW} AND (${MANILA_NOW} + INTERVAL ? MINUTE)`,
      [IMMINENT_LEAD_MINUTES],
    );

    let sentCount = 0;
    for (const row of due) {
      // Compare-and-swap on the stamp so a concurrent tick can't double-send.
      // `updated_at = updated_at` stops this bookkeeping stamp from bumping
      // updated_at -- Transactions and Recent Activity sort by it, and a
      // reminder isn't a change to the appointment itself.
      const [result] = await pool.query(
        `UPDATE appointments SET imminent_reminder_sent_at = NOW(), updated_at = updated_at
         WHERE appointment_id = ? AND imminent_reminder_sent_at IS NULL`,
        [row.appointment_id],
      );
      if (result.affectedRows === 0) continue; // another tick claimed it

      const dateStr =
        row.appointment_date instanceof Date
          ? row.appointment_date.toISOString().slice(0, 10)
          : String(row.appointment_date).slice(0, 10);
      const locationPart = row.location_snapshot ? ` at ${row.location_snapshot}` : "";
      const msg = `Reminder: an appointment is starting soon — ${dateStr} at ${formatTime(row.start_time)}${locationPart}.`;
      createNotification(row.student_id, msg, "appointment");
      createNotification(row.faculty_id, msg, "appointment");
      sentCount += 1;
    }

    if (sentCount > 0) {
      console.log(
        `[appointmentReminderSweeper] Sent ${sentCount} T-${IMMINENT_LEAD_MINUTES}min reminder${sentCount === 1 ? "" : "s"}`,
      );
    }
  } catch (error) {
    console.error("[appointmentReminderSweeper] Imminent sweep failed:", error);
  }
}

// Shared SELECT for both resolution passes: everything the context-aware
// messages need. The window's END anchors every deadline (own snapshot,
// then the live template, then appointment_time as a last resort) --
// appointment_time is always the window's *start*, so anchoring there would
// resolve an appointment while the professor's window is still open.
const RESOLUTION_SELECT = `
  SELECT a.appointment_id, a.tracking_number, a.student_id, a.faculty_id, a.department_id,
         a.appointment_date, a.appointment_time,
         COALESCE(a.window_start_snapshot, fda.start_time) AS window_start,
         COALESCE(a.window_end_snapshot,   fda.end_time)   AS window_end,
         CONCAT(s.first_name, ' ', s.last_name) AS student_name,
         CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
         svc.service_name,
         (a.shared_comment IS NOT NULL AND TRIM(a.shared_comment) <> '') AS has_actions_taken
  FROM appointments a
  JOIN students s ON a.student_id = s.student_id
  JOIN faculty  f ON a.faculty_id = f.faculty_id
  LEFT JOIN faculty_availability fda ON a.availability_id = fda.availability_id
  LEFT JOIN appointment_services svc ON a.service_id = svc.service_id`;
const WINDOW_END_TS =
  "TIMESTAMP(a.appointment_date, COALESCE(a.window_end_snapshot, fda.end_time, a.appointment_time))";

function toMessageContext(row) {
  return {
    trackingNumber: row.tracking_number,
    studentName: row.student_name,
    facultyName: row.faculty_name,
    serviceName: row.service_name,
    appointmentDate: row.appointment_date,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    appointmentTime: row.appointment_time,
  };
}

function emitStatus(row, status) {
  const payload = { appointmentId: row.appointment_id, status };
  emitToUser(row.student_id, "appointment:status-updated", payload);
  emitToUser(row.faculty_id, "appointment:status-updated", payload);
  emitToDept(row.department_id, "appointment:status-updated", payload);
}

function notifyBoth(row, outcome) {
  const { student, faculty } = buildAutoResolutionNotifications(outcome, toMessageContext(row));
  createNotification(row.student_id, student, "appointment");
  createNotification(row.faculty_id, faculty, "appointment");
}

// A 'pending' request nobody approved before its window ended can't be
// approved anymore (approval only works inside the window -- see PATCH
// /professor/appointments/:id/status), so it's auto-REJECTED right at the
// window's end. cancelled_by = AUTO_REJECTED_UNANSWERED marks it as the
// system's doing (a manual rejection leaves it NULL), so screens can say
// "automatically rejected" instead of "rejected by the professor".
async function resolveExpiredPending() {
  const [expired] = await pool.query(
    `${RESOLUTION_SELECT}
     WHERE a.status = 'pending' AND ${WINDOW_END_TS} <= ${MANILA_NOW}`,
  );

  let rejectedCount = 0;
  for (const row of expired) {
    try {
      // Compare-and-swap on status: a professor acting at the same moment wins.
      const [result] = await pool.query(
        `UPDATE appointments
         SET status = 'rejected', cancelled_by = ?, rejection_reason = ?
         WHERE appointment_id = ? AND status = 'pending'`,
        [AUTO_REJECTED_UNANSWERED, buildUnansweredRejectReason(toMessageContext(row)), row.appointment_id],
      );
      if (result.affectedRows === 0) continue;

      emitStatus(row, "rejected");
      notifyBoth(row, "unanswered");
      rejectedCount += 1;
    } catch (err) {
      console.error(`[appointmentReminderSweeper] Failed to auto-reject appointment ${row.appointment_id}:`, err);
    }
  }

  if (rejectedCount > 0) {
    console.log(`[appointmentReminderSweeper] Auto-rejected ${rejectedCount} unanswered request${rejectedCount === 1 ? "" : "s"}`);
  }
}

// An 'approved' appointment APPROVED_RESOLUTION_GRACE_MINUTES past its
// window's end is decided by the professor's "actions taken"
// (shared_comment): recorded -> it happened, auto-COMPLETE; missing -> nobody
// can claim the student was seen, auto-CANCEL with cancelled_by =
// 'system_not_entertained'. The grace period lets a professor who saw a
// student at the very end of the window still record what was done.
//
// The "has actions taken" decision is made in SQL (has_actions_taken) with
// the SAME predicate the UPDATEs guard on -- deciding in JS (whose trim()
// also strips newlines) could pick a branch whose UPDATE never matches,
// leaving the row approved forever. Each UPDATE also re-checks the comment,
// so a note saved mid-sweep can't be overridden by a stale read.
async function resolveStaleApproved() {
  const [stale] = await pool.query(
    `${RESOLUTION_SELECT}
     WHERE a.status = 'approved'
       AND ${WINDOW_END_TS} <= (${MANILA_NOW} - INTERVAL ? MINUTE)`,
    [APPROVED_RESOLUTION_GRACE_MINUTES],
  );

  let completedCount = 0;
  let cancelledCount = 0;
  for (const row of stale) {
    try {
      if (Number(row.has_actions_taken) === 1) {
        const [result] = await pool.query(
          `UPDATE appointments
           SET status = 'completed',
               completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE completed_at END
           WHERE appointment_id = ? AND status = 'approved'
             AND shared_comment IS NOT NULL AND TRIM(shared_comment) <> ''`,
          [row.appointment_id],
        );
        if (result.affectedRows === 0) continue; // changed since the read; next tick re-evaluates

        emitStatus(row, "completed");
        notifyBoth(row, "completed");
        completedCount += 1;
      } else {
        const [result] = await pool.query(
          `UPDATE appointments
           SET status = 'cancelled', cancelled_by = 'system_not_entertained', cancel_reason = ?
           WHERE appointment_id = ? AND status = 'approved'
             AND (shared_comment IS NULL OR TRIM(shared_comment) = '')`,
          [buildNoActionsCancelReason(toMessageContext(row)), row.appointment_id],
        );
        if (result.affectedRows === 0) continue;

        emitStatus(row, "cancelled");
        notifyBoth(row, "no_actions_taken");
        cancelledCount += 1;
      }
    } catch (err) {
      console.error(`[appointmentReminderSweeper] Failed to resolve approved appointment ${row.appointment_id}:`, err);
    }
  }

  if (completedCount > 0) {
    console.log(`[appointmentReminderSweeper] Auto-completed ${completedCount} past-due appointment${completedCount === 1 ? "" : "s"}`);
  }
  if (cancelledCount > 0) {
    console.log(`[appointmentReminderSweeper] Auto-cancelled ${cancelledCount} past-due appointment${cancelledCount === 1 ? "" : "s"} with no actions taken recorded`);
  }
}

// Requests the sweeper auto-rejected before the AUTO_REJECTED_UNANSWERED
// marker existed have cancelled_by NULL, which would now read as a manual
// rejection. Their reason text was always this one exact string, so label
// them once. Idempotent; `updated_at = updated_at` keeps the relabel from
// reshuffling Transactions / Recent Activity.
async function labelLegacyAutoRejections() {
  try {
    const [result] = await pool.query(
      `UPDATE appointments SET cancelled_by = ?, updated_at = updated_at
       WHERE status = 'rejected' AND cancelled_by IS NULL AND rejection_reason = ?`,
      [AUTO_REJECTED_UNANSWERED, LEGACY_UNANSWERED_REASON],
    );
    if (result.affectedRows > 0) {
      console.log(`[appointmentReminderSweeper] Labeled ${result.affectedRows} older auto-rejection${result.affectedRows === 1 ? "" : "s"}`);
    }
  } catch (err) {
    console.error("[appointmentReminderSweeper] Legacy auto-rejection relabel failed:", err);
  }
}

// Each pass is isolated (one failing never skips the other), and the
// in-flight guard stops a slow tick from overlapping the next one.
let resolving = false;
async function resolvePastDueAppointments() {
  if (resolving) return;
  resolving = true;
  try {
    for (const [name, pass] of [["pending", resolveExpiredPending], ["approved", resolveStaleApproved]]) {
      try {
        await pass();
      } catch (err) {
        console.error(`[appointmentReminderSweeper] ${name} resolution pass failed:`, err);
      }
    }
  } finally {
    resolving = false;
  }
}

function startAppointmentReminderSweeper() {
  setTimeout(async () => {
    await labelLegacyAutoRejections();
    await resolvePastDueAppointments();
  }, BOOT_DELAY_MS);
  return setInterval(() => {
    sweepImminentAppointmentReminders();
    resolvePastDueAppointments();
  }, TICK_INTERVAL_MS);
}

module.exports = {
  startAppointmentReminderSweeper,
  sweepImminentAppointmentReminders,
  resolvePastDueAppointments,
};
