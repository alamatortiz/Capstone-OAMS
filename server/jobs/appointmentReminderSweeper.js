const pool = require("../db");
const { createNotification } = require("../utils/notifications");
const { emitToUser, emitToDept } = require("../sockets");

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const REMINDER_LEAD_HOURS = 24;
const COMPLETE_GRACE_HOURS = 3;
const PENDING_NUDGE_HOURS = 48;

// `appointment_date`/`appointment_time` are plain calendar-date/wall-clock
// values (no timezone conversion needed, unlike TIMESTAMP columns) -- this
// just normalizes whichever JS shape mysql2 hands back (Date object for
// DATE, string for TIME) into "YYYY-MM-DD" / "HH:MM" for the message.
function formatDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function formatTime(value) {
  return String(value).slice(0, 5);
}

function buildReminderMessage({ appointment_date, appointment_time, location_snapshot }) {
  const dateStr = formatDate(appointment_date);
  const timeStr = formatTime(appointment_time);
  const locationPart = location_snapshot ? ` at ${location_snapshot}` : "";
  return `Reminder: your appointment is scheduled for ${dateStr} at ${timeStr}${locationPart}.`;
}

// Finds every 'approved' appointment starting within REMINDER_LEAD_HOURS that
// hasn't been reminded yet, and notifies the student. Unlike the document
// sweeper, a fixed appointment_date/time keeps matching this window on every
// tick until the appointment passes -- so `reminder_sent_at` is required
// here to stop the sweep from re-notifying the same appointment repeatedly.
async function sweepAppointmentReminders() {
  try {
    const [due] = await pool.query(
      // appointment_date/time are Manila wall-clock with no timezone, but NOW()
      // is UTC (db.js keeps the connection at "Z" and the container has no TZ
      // override). Compare against Manila-now so the 24h window is real -- see
      // queueExpirySweeper.js for the same reasoning. CONVERT_TZ with numeric
      // offsets needs no MySQL timezone tables.
      `SELECT appointment_id, student_id, appointment_date, appointment_time, location_snapshot
       FROM appointments
       WHERE status = 'approved'
         AND reminder_sent_at IS NULL
         AND TIMESTAMP(appointment_date, appointment_time)
             BETWEEN CONVERT_TZ(NOW(), '+00:00', '+08:00')
                 AND (CONVERT_TZ(NOW(), '+00:00', '+08:00') + INTERVAL ? HOUR)`,
      [REMINDER_LEAD_HOURS],
    );

    let remindedCount = 0;
    for (const row of due) {
      const [result] = await pool.query(
        `UPDATE appointments SET reminder_sent_at = NOW() WHERE appointment_id = ? AND reminder_sent_at IS NULL`,
        [row.appointment_id],
      );
      // Compare-and-swap on reminder_sent_at IS NULL, same defensive pattern
      // as queueNoShowSweeper's status='serving' check -- if another sweep
      // tick already claimed this row, affectedRows is 0 and we skip it.
      if (result.affectedRows === 0) continue;

      createNotification(row.student_id, buildReminderMessage(row), "appointment");
      remindedCount += 1;
    }

    if (remindedCount > 0) {
      console.log(
        `[appointmentReminderSweeper] Sent ${remindedCount} reminder${remindedCount === 1 ? "" : "s"}`,
      );
    }

    await sweepStaleApproved();
    await sweepStalePending();
    await sweepExpiredPending();
  } catch (error) {
    console.error("[appointmentReminderSweeper] Sweep failed:", error);
  }
}

// An 'approved' appointment whose date/time passed COMPLETE_GRACE_HOURS ago
// with nobody marking it otherwise (completed/cancelled) would otherwise sit
// in 'approved' forever -- there's no check-in mechanism for appointments
// the way queues have one, so this can't detect a genuine no-show, but
// auto-resolving stale approved appointments to 'completed' avoids the
// alternative of a permanently-stuck, obviously-past-due record. Mirrors the
// exact notify+emit shape of the manual status-update route in
// professorRoutes.js so a transaction feed can't tell the two apart.
async function sweepStaleApproved() {
  const [stale] = await pool.query(
    // Manila-now comparison -- see the note in sweepAppointmentReminders above.
    `SELECT appointment_id, student_id, department_id
     FROM appointments
     WHERE status = 'approved'
       AND TIMESTAMP(appointment_date, appointment_time)
           <= (CONVERT_TZ(NOW(), '+00:00', '+08:00') - INTERVAL ? HOUR)`,
    [COMPLETE_GRACE_HOURS],
  );

  let completedCount = 0;
  for (const row of stale) {
    const [result] = await pool.query(
      `UPDATE appointments SET status = 'completed' WHERE appointment_id = ? AND status = 'approved'`,
      [row.appointment_id],
    );
    if (result.affectedRows === 0) continue;

    emitToUser(row.student_id, "appointment:status-updated", { appointmentId: row.appointment_id, status: "completed" });
    emitToDept(row.department_id, "appointment:status-updated", { appointmentId: row.appointment_id, status: "completed" });
    createNotification(row.student_id, "Your appointment has been marked as completed.", "appointment");
    completedCount += 1;
  }

  if (completedCount > 0) {
    console.log(`[appointmentReminderSweeper] Auto-completed ${completedCount} past-due appointment${completedCount === 1 ? "" : "s"}`);
  }
}

// A 'pending' request nobody approved or rejected within PENDING_NUDGE_HOURS
// nudges the faculty member who's blocking it -- pending_nudge_sent_at is a
// dedicated flag (separate from reminder_sent_at, which tracks an unrelated
// notification on the same row) so this fires exactly once per request, not
// every 15 minutes for as long as it stays pending.
async function sweepStalePending() {
  const [stale] = await pool.query(
    `SELECT appointment_id, faculty_id
     FROM appointments
     WHERE status = 'pending'
       AND pending_nudge_sent_at IS NULL
       AND created_at <= (NOW() - INTERVAL ? HOUR)`,
    [PENDING_NUDGE_HOURS],
  );

  let nudgedCount = 0;
  for (const row of stale) {
    const [result] = await pool.query(
      `UPDATE appointments SET pending_nudge_sent_at = NOW() WHERE appointment_id = ? AND pending_nudge_sent_at IS NULL`,
      [row.appointment_id],
    );
    if (result.affectedRows === 0) continue;

    createNotification(row.faculty_id, "You have a pending appointment request awaiting your response.", "appointment");
    nudgedCount += 1;
  }

  if (nudgedCount > 0) {
    console.log(`[appointmentReminderSweeper] Nudged faculty on ${nudgedCount} stale pending request${nudgedCount === 1 ? "" : "s"}`);
  }
}

// A 'pending' request nobody approved/rejected before its own scheduled
// date+time arrived and passed can't ever be honored -- there's no slot left
// to serve it in -- so it's auto-cancelled instead of sitting in 'pending'
// forever. Distinct from sweepStalePending above (which only nudges faculty
// while the appointment is still in the future) and from sweepStaleApproved
// (which resolves an *approved* past-due appointment to 'completed', since
// that one was actually confirmed to happen). cancelled_by = 'system_expired'
// keeps this out of the 'system' bucket used for schedule-change cancellations
// so the activity-feed/notification copy can tell the two apart.
async function sweepExpiredPending() {
  const [expired] = await pool.query(
    // Manila-now comparison -- see the note in sweepAppointmentReminders above.
    `SELECT appointment_id, student_id, faculty_id, department_id
     FROM appointments
     WHERE status = 'pending'
       AND TIMESTAMP(appointment_date, appointment_time)
           <= CONVERT_TZ(NOW(), '+00:00', '+08:00')`,
  );

  let cancelledCount = 0;
  for (const row of expired) {
    const [result] = await pool.query(
      `UPDATE appointments SET status = 'cancelled', cancelled_by = 'system_expired'
       WHERE appointment_id = ? AND status = 'pending'`,
      [row.appointment_id],
    );
    if (result.affectedRows === 0) continue;

    emitToUser(row.student_id, "appointment:status-updated", { appointmentId: row.appointment_id, status: "cancelled" });
    emitToUser(row.faculty_id, "appointment:status-updated", { appointmentId: row.appointment_id, status: "cancelled" });
    emitToDept(row.department_id, "appointment:status-updated", { appointmentId: row.appointment_id, status: "cancelled" });
    createNotification(row.student_id, "Your appointment request expired without a response and was automatically cancelled.", "appointment");
    createNotification(row.faculty_id, "An unanswered appointment request expired and was automatically cancelled.", "appointment");
    cancelledCount += 1;
  }

  if (cancelledCount > 0) {
    console.log(`[appointmentReminderSweeper] Auto-cancelled ${cancelledCount} expired pending request${cancelledCount === 1 ? "" : "s"}`);
  }
}

function startAppointmentReminderSweeper() {
  return setInterval(sweepAppointmentReminders, SWEEP_INTERVAL_MS);
}

module.exports = { startAppointmentReminderSweeper, sweepAppointmentReminders };
