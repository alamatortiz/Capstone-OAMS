const pool = require("../db");
const { createNotification } = require("../utils/notifications");

// Document timelines are day-scale, not second-scale -- same cadence as
// documentPickupSweeper.js.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ESCALATION_DAYS = 7;

// Unlike documentPickupSweeper.js (which nags the requester daily to come
// pick up a 'generated' document, then escalates to admins after a week),
// submissions have no "requester needs to act" phase -- the admin is the one
// who needs to act, from the moment it's sent. So this is a single
// escalation phase: submissions stuck in pending/processing for 7+ days get
// escalated once to the department's admins. Notifies, does not auto-reject.
// `needed_by` is never checked here either -- informational only, never a
// trigger for an automatic status change (see documentPickupSweeper.js).
async function escalateStaleSubmissions() {
  try {
    const [stale] = await pool.query(
      `SELECT submission_id, tracking_number, title, department_id
       FROM document_submissions
       WHERE status IN ('pending', 'processing')
         AND escalated_at IS NULL
         AND updated_at <= (NOW() - INTERVAL ? DAY)`,
      [ESCALATION_DAYS],
    );

    let escalatedCount = 0;
    for (const row of stale) {
      if (await markEscalated(row.submission_id)) {
        await notifyDeptAdmins(row.department_id, row.tracking_number, row.title);
        escalatedCount += 1;
      }
    }
    if (escalatedCount > 0) {
      console.log(
        `[documentSubmissionStaleSweeper] Escalated ${escalatedCount} stale submission${escalatedCount === 1 ? "" : "s"} to admins`,
      );
    }
  } catch (error) {
    console.error("[documentSubmissionStaleSweeper] Sweep failed:", error);
  }
}

// Compare-and-swap on escalated_at IS NULL, same defensive pattern as
// documentPickupSweeper.js's markEscalated -- returns whether this call
// actually claimed the row. `updated_at = updated_at` preserves the
// staleness clock despite ON UPDATE CURRENT_TIMESTAMP.
async function markEscalated(submissionId) {
  const [result] = await pool.query(
    `UPDATE document_submissions SET escalated_at = NOW(), updated_at = updated_at
     WHERE submission_id = ? AND escalated_at IS NULL`,
    [submissionId],
  );
  return result.affectedRows > 0;
}

async function notifyDeptAdmins(departmentId, trackingNumber, title) {
  const [admins] = await pool.query(
    `SELECT admin_id AS user_id FROM administrators WHERE department_id = ?`,
    [departmentId],
  );
  const message = `Sent document "${title}" (${trackingNumber}) has been awaiting action for over a week.`;
  admins.forEach((row) => createNotification(row.user_id, message, "document"));
}

function startDocumentSubmissionStaleSweeper() {
  return setInterval(escalateStaleSubmissions, SWEEP_INTERVAL_MS);
}

module.exports = { startDocumentSubmissionStaleSweeper, escalateStaleSubmissions };
