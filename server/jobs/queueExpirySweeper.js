const pool = require("../db");
const { emitToSlot, emitToDept } = require("../sockets");
const { getManilaDateString, getManilaTimeString } = require("../utils/dateTime");

const SWEEP_INTERVAL_MS = 30 * 1000;

// Flips 'open'/'paused' slots to 'closed' once their posted end_time has
// passed, so the admin dashboard doesn't keep showing a queue as "Open"
// indefinitely after hours (previously required a manual Close click).
// Only stops new joins -- students already waiting/serving are left alone,
// mirroring the existing capacity-driven auto-close in POST /queues/join.
async function sweepExpiredSlots() {
  try {
    const manilaToday = getManilaDateString();
    const manilaNow = getManilaTimeString();

    // department_id follows the same COALESCE(service dept, hosting admin's
    // dept) fallback used elsewhere for global (department_id IS NULL) services.
    const [expired] = await pool.query(
      `SELECT qs.slot_id, COALESCE(s.department_id, adm.department_id) AS department_id
       FROM queue_slots qs
       JOIN services s ON qs.service_id = s.service_id
       JOIN administrators adm ON qs.admin_id = adm.admin_id
       WHERE qs.status IN ('open', 'paused')
         AND qs.slot_date = ?
         AND qs.end_time <= ?`,
      [manilaToday, manilaNow],
    );

    if (expired.length === 0) return;

    for (const row of expired) {
      const { slot_id: slotId, department_id: deptId } = row;
      await pool.query(
        `UPDATE queue_slots SET status = 'closed', close_reason = 'Queue hours ended' WHERE slot_id = ?`,
        [slotId],
      );

      const payload = { slotId, status: "closed", reason: "Queue hours ended" };
      emitToSlot(slotId, "queue:slot-status", payload);
      emitToDept(deptId, "queue:slot-status", payload);
    }

    console.log(
      `[queueExpirySweeper] Closed ${expired.length} expired queue${expired.length === 1 ? "" : "s"}: ${expired.map((r) => r.slot_id).join(", ")}`,
    );
  } catch (error) {
    console.error("[queueExpirySweeper] Sweep failed:", error);
  }
}

function startExpirySweeper() {
  // Deliberately not firing an immediate sweep on boot -- see the identical
  // note in queueNoShowSweeper.js. End-time granularity is minutes-scale, so
  // waiting for the first interval tick costs nothing functionally.
  return setInterval(sweepExpiredSlots, SWEEP_INTERVAL_MS);
}

module.exports = { startExpirySweeper, sweepExpiredSlots };
