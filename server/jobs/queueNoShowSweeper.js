const pool = require("../db");
const { emitToSlot, emitToUser, emitToDept } = require("../sockets");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");
const { createNotification } = require("../utils/notifications");

const SWEEP_INTERVAL_MS = 30 * 1000;

// Voids a single 'serving' queue entry as a no-show: DB writes only (no
// socket/notification side effects — the caller emits those after its own
// transaction commits, so a rollback can't leave stale client state behind).
// `db` is whatever query executor the caller passes (pool for autocommit, or
// an in-flight transaction connection) so callers control commit timing.
// The UPDATE is a compare-and-swap on status='serving': if another request
// (serve/skip/pause) already resolved this entry since the caller's own
// read, affectedRows is 0 and nothing here is applied or logged — this is
// what stops the sweeper from clobbering an entry that was legitimately
// completed moments earlier. Shared by the timeout sweep below and the
// admin-triggered "Skip" action (PATCH /queue-hosting/:slotId/skip).
async function voidQueueEntry(db, { queueId, slotId, changedBy = null, note }) {
  const [result] = await db.query(
    `UPDATE queues SET status = 'no_show', completed_at = NOW() WHERE queue_id = ? AND status = 'serving'`,
    [queueId],
  );
  if (result.affectedRows === 0) {
    return { voided: false, settleResult: null };
  }

  await db.query(
    `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, 'serving', 'no_show', ?, ?, NOW())`,
    [queueId, changedBy, note],
  );

  // Voiding frees a spot under the daily cap same as a cancellation, and
  // removes this entry from the unserved count -- settle the slot: reopen
  // it if it was 'full' and there's room again (and hours haven't ended),
  // or mark it 'completed' if nobody's left waiting/serving.
  const settleResult = await settleSlotAfterEntryChange(db, slotId);

  return { voided: true, settleResult };
}

// Socket/notification side effects for a successful voidQueueEntry() call.
// Call this only after the surrounding transaction (if any) has committed.
function emitVoidEvents({ slotId, queueId, studentId, deptId, settleResult }) {
  const noShowPayload = { slotId, queueId, studentId };
  emitToSlot(slotId, "queue:no-show", noShowPayload);
  emitToUser(studentId, "queue:no-show", noShowPayload);
  emitToDept(deptId, "queue:no-show", noShowPayload);
  createNotification(studentId, "You were marked as a no-show and your queue ticket was voided.");

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
// viewing. `arrived_at IS NULL` excludes students an admin has already
// confirmed as physically present: once service has actually started, no
// timeout should auto-void them regardless of how long it takes.
async function sweepNoShows() {
  try {
    const [stale] = await pool.query(
      `SELECT q.queue_id, q.slot_id, q.student_id, s.department_id
       FROM queues q
       JOIN queue_slots qs ON q.slot_id = qs.slot_id
       JOIN services s ON qs.service_id = s.service_id
       WHERE q.status = 'serving'
         AND q.called_at IS NOT NULL
         AND q.arrived_at IS NULL
         AND TIMESTAMPDIFF(MINUTE, q.called_at, NOW()) >= qs.no_show_timeout_minutes`,
    );

    if (stale.length === 0) return;

    let voidedCount = 0;
    for (const row of stale) {
      const { queue_id: queueId, slot_id: slotId, student_id: studentId, department_id: deptId } = row;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await voidQueueEntry(conn, {
          queueId,
          slotId,
          changedBy: null,
          note: "Auto-voided: no-show timeout exceeded",
        });
        await conn.commit();
        if (result.voided) {
          voidedCount += 1;
          emitVoidEvents({ slotId, queueId, studentId, deptId, settleResult: result.settleResult });
        }
      } catch (entryError) {
        await conn.rollback();
        console.error(`[queueNoShowSweeper] Failed to void queue ${queueId}:`, entryError);
      } finally {
        conn.release();
      }
    }

    if (voidedCount > 0) {
      console.log(
        `[queueNoShowSweeper] Voided ${voidedCount} no-show entr${voidedCount === 1 ? "y" : "ies"}`,
      );
    }
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

module.exports = { startNoShowSweeper, sweepNoShows, voidQueueEntry, emitVoidEvents };
