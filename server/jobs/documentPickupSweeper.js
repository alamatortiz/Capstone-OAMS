const pool = require("../db");
const { createNotification } = require("../utils/notifications");

// Document pickup timelines are day-scale, not second-scale like queue
// no-shows, so this runs far less often than queueNoShowSweeper's 30s tick.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STALE_HOURS = 24;
const ESCALATION_DAYS = 7;

// Finds every document request (student-side and faculty-side) that's been
// sitting in 'ready' (ready for pickup) for longer than STALE_HOURS and
// reminds the requester. Neither table has a dedicated "became ready"
// timestamp, so this reuses `updated_at` (already ON UPDATE CURRENT_TIMESTAMP
// on both tables) as a "time since last status change" proxy instead of
// adding a tracking column -- the accepted trade-off is a request stuck in
// 'ready' gets reminded roughly once per sweep (~daily) until claimed,
// which reads as an intentional daily nag rather than a bug.
async function sweepDocumentPickups() {
  try {
    const [studentStale] = await pool.query(
      `SELECT dr.request_id, dr.student_id AS user_id, dr.tracking_number, s.service_name
       FROM document_requests dr
       JOIN document_services s ON dr.service_id = s.service_id
       WHERE dr.status = 'ready' AND dr.updated_at <= (NOW() - INTERVAL ? HOUR)`,
      [STALE_HOURS],
    );
    const [facultyStale] = await pool.query(
      `SELECT fdr.request_id, fdr.faculty_id AS user_id, fdr.tracking_number, s.service_name
       FROM faculty_document_requests fdr
       JOIN document_services s ON fdr.service_id = s.service_id
       WHERE fdr.status = 'ready' AND fdr.updated_at <= (NOW() - INTERVAL ? HOUR)`,
      [STALE_HOURS],
    );

    const stale = [...studentStale, ...facultyStale];
    if (stale.length > 0) {
      stale.forEach((row) =>
        createNotification(
          row.user_id,
          `Your ${row.service_name} request (${row.tracking_number}) is ready for pickup. Please claim it as soon as possible.`,
          "document",
        ),
      );
      console.log(
        `[documentPickupSweeper] Reminded ${stale.length} stale pickup${stale.length === 1 ? "" : "s"}`,
      );
    }

    await notifyOverdueClaims();
    await escalateAbandonedPickups();
  } catch (error) {
    console.error("[documentPickupSweeper] Sweep failed:", error);
  }
}

// A Ready document can carry an optional office-set `claim_by` date (set by
// an admin on the mark-ready transition -- distinct from the requester's own
// `needed_by` wish-date). Once that date passes, nudge the requester once
// (overdue_notified_at gates it, like escalated_at above) and move on -- the
// admin list flags it visually, and the 7-day escalateAbandonedPickups still
// handles the "unclaimed far too long" case regardless of claim_by. Covers
// all three document tables (the daily reminder above only covers the two
// request tables; a submission can be Ready and overdue too).
async function notifyOverdueClaims() {
  const sources = [
    { table: "document_requests", idCol: "request_id", userSel: "student_id" },
    { table: "faculty_document_requests", idCol: "request_id", userSel: "faculty_id" },
    { table: "document_submissions", idCol: "submission_id", userSel: "COALESCE(student_id, faculty_id)" },
  ];

  let notified = 0;
  for (const src of sources) {
    const [rows] = await pool.query(
      `SELECT ${src.idCol} AS id, ${src.userSel} AS user_id, tracking_number
       FROM ${src.table}
       WHERE status = 'ready'
         AND claim_by IS NOT NULL
         AND claim_by < CURDATE()
         AND overdue_notified_at IS NULL`,
    );
    for (const row of rows) {
      const [cas] = await pool.query(
        `UPDATE ${src.table} SET overdue_notified_at = NOW(), updated_at = updated_at
         WHERE ${src.idCol} = ? AND overdue_notified_at IS NULL`,
        [row.id],
      );
      if (cas.affectedRows === 0) continue; // another tick claimed it
      createNotification(
        row.user_id,
        `Your document (${row.tracking_number}) has passed its claim-by date. Please collect it as soon as possible.`,
        "document",
      );
      notified += 1;
    }
  }

  if (notified > 0) {
    console.log(
      `[documentPickupSweeper] Notified ${notified} overdue claim${notified === 1 ? "" : "s"}`,
    );
  }
}

// Beyond the daily student/faculty reminder above, a request that's been
// ready for pickup for a full week likely needs a human to look at it --
// escalates to every admin in the requester's department, once per request
// (escalated_at gates this so it doesn't refire on every subsequent daily
// sweep the way the student/faculty reminder deliberately does). This
// notifies, it does not auto-cancel -- cancelling someone's official
// document with no human review felt like the wrong default. In
// particular, `needed_by` is never checked here or anywhere else in this
// file -- it's informational only (drives the client's "Overdue" badge),
// never a trigger for an automatic status change.
async function escalateAbandonedPickups() {
  const [studentAbandoned] = await pool.query(
    `SELECT dr.request_id, dr.tracking_number, s.department_id
     FROM document_requests dr
     JOIN students s ON dr.student_id = s.student_id
     WHERE dr.status = 'ready'
       AND dr.escalated_at IS NULL
       AND dr.updated_at <= (NOW() - INTERVAL ? DAY)`,
    [ESCALATION_DAYS],
  );
  const [facultyAbandoned] = await pool.query(
    `SELECT fdr.request_id, fdr.tracking_number, f.department_id
     FROM faculty_document_requests fdr
     JOIN faculty f ON fdr.faculty_id = f.faculty_id
     WHERE fdr.status = 'ready'
       AND fdr.escalated_at IS NULL
       AND fdr.updated_at <= (NOW() - INTERVAL ? DAY)`,
    [ESCALATION_DAYS],
  );

  let escalatedCount = 0;

  for (const row of studentAbandoned) {
    if (await markEscalated("document_requests", row.request_id)) {
      await notifyDeptAdmins(row.department_id, row.tracking_number);
      escalatedCount += 1;
    }
  }
  for (const row of facultyAbandoned) {
    if (await markEscalated("faculty_document_requests", row.request_id)) {
      await notifyDeptAdmins(row.department_id, row.tracking_number);
      escalatedCount += 1;
    }
  }

  if (escalatedCount > 0) {
    console.log(`[documentPickupSweeper] Escalated ${escalatedCount} abandoned pickup${escalatedCount === 1 ? "" : "s"} to admins`);
  }
}

// Compare-and-swap on escalated_at IS NULL, same defensive pattern used
// throughout the sweeper jobs -- returns whether this call actually claimed
// the row (false if another tick already did).
//
// `updated_at = updated_at` looks like a no-op but isn't: both tables define
// updated_at as ON UPDATE CURRENT_TIMESTAMP, which bumps on ANY UPDATE to the
// row unless a value is explicitly assigned to it -- without this, setting
// escalated_at would silently reset the daily reminder's own staleness clock
// (found by testing a second sweep pass: the reminder stopped re-firing
// after the row got escalated once, since updated_at looked fresh again).
async function markEscalated(table, requestId) {
  const [result] = await pool.query(
    `UPDATE ${table} SET escalated_at = NOW(), updated_at = updated_at WHERE request_id = ? AND escalated_at IS NULL`,
    [requestId],
  );
  return result.affectedRows > 0;
}

async function notifyDeptAdmins(departmentId, trackingNumber) {
  const [admins] = await pool.query(
    `SELECT admin_id AS user_id FROM administrators WHERE department_id = ?`,
    [departmentId],
  );
  const message = `Document request ${trackingNumber} has been unclaimed for over a week and may need attention.`;
  admins.forEach((row) => createNotification(row.user_id, message, "document"));
}

function startDocumentPickupSweeper() {
  return setInterval(sweepDocumentPickups, SWEEP_INTERVAL_MS);
}

module.exports = { startDocumentPickupSweeper, sweepDocumentPickups };
