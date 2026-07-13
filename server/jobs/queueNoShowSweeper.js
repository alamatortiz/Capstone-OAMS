const pool = require("../db");
const { emitToSlot, emitToUser, emitToDept } = require("../sockets");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");

const SWEEP_INTERVAL_MS = 30 * 1000;

// Voids a single 'serving' queue entry as a no-show: marks it, logs the
// transition, notifies sockets, and settles the slot (reopens it if it was
// 'full' with room again, or marks it 'completed' if nobody's left).
// Shared by the timeout sweep below and the admin-triggered "Skip" action
// (PATCH /queue-hosting/:slotId/skip) so both paths stay in sync.
async function voidQueueEntry({ queueId, slotId, studentId, deptId, changedBy = null, note }) {
  await pool.query(
    `UPDATE queues SET status = 'no_show', completed_at = NOW() WHERE queue_id = ?`,
    [queueId],
  );
  await pool.query(
    `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, 'serving', 'no_show', ?, ?, NOW())`,
    [queueId, changedBy, note],
  );

  const noShowPayload = { slotId, queueId, studentId };
  emitToSlot(slotId, "queue:no-show", noShowPayload);
  emitToUser(studentId, "queue:no-show", noShowPayload);
  emitToDept(deptId, "queue:no-show", noShowPayload);

  // Voiding frees a spot under the daily cap same as a cancellation, and
  // removes this entry from the unserved count -- settle the slot: reopen
  // it if it was 'full' and there's room again (and hours haven't ended),
  // or mark it 'completed' if nobody's left waiting/serving.
  const settleResult = await settleSlotAfterEntryChange(pool, slotId);
  if (settleResult) {
    const settledPayload = { slotId, status: settleResult.newStatus };
    emitToSlot(slotId, "queue:slot-status", settledPayload);
    emitToDept(deptId, "queue:slot-status", settledPayload);
  }
}

// Finds every 'serving' queue entry whose caller-configured no-show timeout
// has elapsed and auto-voids it, freeing the slot for the admin to call the
// next student. Runs on a plain interval since this project has no job
// scheduler — a lazy per-request check would miss slots nobody is actively
// viewing.
async function sweepNoShows() {
  try {
    const [stale] = await pool.query(
      `SELECT q.queue_id, q.slot_id, q.student_id, s.department_id
       FROM queues q
       JOIN queue_slots qs ON q.slot_id = qs.slot_id
       JOIN services s ON qs.service_id = s.service_id
       WHERE q.status = 'serving'
         AND q.called_at IS NOT NULL
         AND TIMESTAMPDIFF(MINUTE, q.called_at, NOW()) >= qs.no_show_timeout_minutes`,
    );

    if (stale.length === 0) return;

    for (const row of stale) {
      const { queue_id: queueId, slot_id: slotId, student_id: studentId, department_id: deptId } = row;
      await voidQueueEntry({
        queueId,
        slotId,
        studentId,
        deptId,
        changedBy: null,
        note: "Auto-voided: no-show timeout exceeded",
      });
    }

    console.log(
      `[queueNoShowSweeper] Voided ${stale.length} no-show entr${stale.length === 1 ? "y" : "ies"}: ${stale.map((r) => r.queue_id).join(", ")}`,
    );
  } catch (error) {
    console.error("[queueNoShowSweeper] Sweep failed:", error);
  }
}

function startNoShowSweeper() {
  // Deliberately not firing an immediate sweep on boot: the DB container can
  // still be finishing startup/init scripts at the exact moment this module
  // loads (server.js calls this right after app.listen()), even though
  // docker-compose's depends_on/service_healthy should normally prevent that.
  // No-show timeouts are minutes-scale, so waiting for the first interval
  // tick costs nothing functionally and avoids a harmless-but-alarming
  // ECONNREFUSED log line on a cold stack start.
  return setInterval(sweepNoShows, SWEEP_INTERVAL_MS);
}

module.exports = { startNoShowSweeper, sweepNoShows, voidQueueEntry };
