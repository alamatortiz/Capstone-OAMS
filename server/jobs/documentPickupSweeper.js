const pool = require("../db");
const { createNotification } = require("../utils/notifications");

// Document pickup timelines are day-scale, not second-scale like queue
// no-shows, so this runs far less often than queueNoShowSweeper's 30s tick.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STALE_HOURS = 24;

const PICKUP_MESSAGE =
  "Your document request is ready for pickup. Please claim it as soon as possible.";

// Finds every document request (student-side and faculty-side) that's been
// sitting in 'generated' (ready for pickup) for longer than STALE_HOURS and
// reminds the requester. Neither table has a dedicated "became ready"
// timestamp, so this reuses `updated_at` (already ON UPDATE CURRENT_TIMESTAMP
// on both tables) as a "time since last status change" proxy instead of
// adding a tracking column -- the accepted trade-off is a request stuck in
// 'generated' gets reminded roughly once per sweep (~daily) until claimed,
// which reads as an intentional daily nag rather than a bug.
async function sweepDocumentPickups() {
  try {
    const [studentStale] = await pool.query(
      `SELECT request_id, student_id AS user_id
       FROM document_requests
       WHERE status = 'generated' AND updated_at <= (NOW() - INTERVAL ? HOUR)`,
      [STALE_HOURS],
    );
    const [facultyStale] = await pool.query(
      `SELECT request_id, faculty_id AS user_id
       FROM faculty_document_requests
       WHERE status = 'generated' AND updated_at <= (NOW() - INTERVAL ? HOUR)`,
      [STALE_HOURS],
    );

    const stale = [...studentStale, ...facultyStale];
    if (stale.length === 0) return;

    stale.forEach((row) => createNotification(row.user_id, PICKUP_MESSAGE, "document"));

    console.log(
      `[documentPickupSweeper] Reminded ${stale.length} stale pickup${stale.length === 1 ? "" : "s"}`,
    );
  } catch (error) {
    console.error("[documentPickupSweeper] Sweep failed:", error);
  }
}

function startDocumentPickupSweeper() {
  return setInterval(sweepDocumentPickups, SWEEP_INTERVAL_MS);
}

module.exports = { startDocumentPickupSweeper, sweepDocumentPickups };
