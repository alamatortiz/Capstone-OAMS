const pool = require("../db");
const { emitToSlot, emitToUser, emitToDept } = require("../sockets");

const SWEEP_INTERVAL_MS = 30 * 1000;

// Voids a single 'serving' queue entry as a no-show: marks it, logs the
// transition, notifies sockets, and reopens the slot if it had been
// auto-closed for hitting max_capacity. Shared by the timeout sweep below
// and the admin-triggered "Skip" action (PATCH /queue-hosting/:slotId/skip)
// so both paths stay in sync.
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

  // Voiding frees a spot under the daily cap same as a cancellation --
  // reopen the slot if /queues/join auto-closed it for hitting max_capacity.
  const [[slotRow]] = await pool.query(
    `SELECT qs.status, qs.close_reason, qs.max_capacity,
       (SELECT COUNT(*) FROM queues q WHERE q.slot_id = qs.slot_id AND q.status IN ('waiting', 'serving', 'completed')) AS claimed
     FROM queue_slots qs WHERE qs.slot_id = ?`,
    [slotId],
  );
  if (
    slotRow &&
    slotRow.status === "closed" &&
    slotRow.close_reason === "Capacity reached — queue full for today" &&
    slotRow.claimed < slotRow.max_capacity
  ) {
    await pool.query(
      `UPDATE queue_slots SET status = 'open', close_reason = NULL WHERE slot_id = ?`,
      [slotId],
    );
    const reopenedPayload = { slotId, status: "open" };
    emitToSlot(slotId, "queue:slot-status", reopenedPayload);
    emitToDept(deptId, "queue:slot-status", reopenedPayload);
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
