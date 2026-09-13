const pool = require("../db");
const { emitToSlot, emitToDept } = require("../sockets");
const { getManilaDateString, getManilaTimeString } = require("../utils/dateTime");

const SWEEP_INTERVAL_MS = 30 * 1000;

// Once a slot's posted end_time passes, decide its fate directly instead of
// always parking it at 'expired': if nobody's left waiting/serving, it's
// truly done, so settle it straight to 'completed' (covers both a queue
// nobody ever joined and one that was fully served before hours ended --
// otherwise it would sit at 'expired' forever, since nothing else ever
// re-checks a slot with no more entries left to change status). Only a slot
// that still has people gets parked at 'expired' -- students already
// waiting/serving are left alone and settle into 'completed' once served
// (see queueSlotSettlement.js), mirroring the existing capacity-driven
// auto-close in POST /queues/join.
//
// Locked per-row (SELECT ... FOR UPDATE inside a transaction, same pattern
// as queueNoShowSweeper.js's sweepNoShows()) rather than one bulk UPDATE:
// this sweeper and the no-show sweeper both run on the same 30s interval and
// can race on the same slot (e.g. this sweeper reads unserved=1 for a slot
// the instant the no-show sweeper is, in the same moment, voiding that
// slot's last entry). Without a shared row lock, the two can interleave so
// neither one settles the slot to 'completed' -- the same "stuck at expired
// forever" failure mode, just in a narrower window. Locking the same
// queue_slots row (as settleSlotAfter
// EntryChange/getOwnedSlotOrRespond already do everywhere else) serializes
// the two: whichever commits first, the other re-reads fresh state before
// acting.
async function sweepExpiredSlots() {
  try {
    const manilaToday = getManilaDateString();
    const manilaNow = getManilaTimeString();

    const [candidates] = await pool.query(
      `SELECT qs.slot_id
       FROM queue_slots qs
       WHERE qs.status IN ('open', 'paused')
         AND qs.slot_date = ?
         AND qs.end_time <= ?`,
      [manilaToday, manilaNow],
    );

    if (candidates.length === 0) return;

    let expiredCount = 0;
    let completedCount = 0;

    for (const { slot_id: slotId } of candidates) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [[slot]] = await conn.query(
          `SELECT qs.status, qs.department_id,
             (SELECT COUNT(*) FROM queues q WHERE q.slot_id = qs.slot_id AND q.status IN ('waiting', 'serving')) AS unserved
           FROM queue_slots qs WHERE qs.slot_id = ? FOR UPDATE`,
          [slotId],
        );

        // Already moved on (settled by an entry-change, or already swept)
        // since the outer SELECT ran -- nothing to do.
        if (!slot || !["open", "paused"].includes(slot.status)) {
          await conn.commit();
          continue;
        }

        const newStatus = slot.unserved === 0 ? "completed" : "expired";
        if (newStatus === "completed") {
          await conn.query(`UPDATE queue_slots SET status = 'completed' WHERE slot_id = ?`, [slotId]);
        } else {
          await conn.query(
            `UPDATE queue_slots SET status = 'expired', close_reason = 'Queue hours ended' WHERE slot_id = ?`,
            [slotId],
          );
        }

        await conn.commit();

        const payload =
          newStatus === "completed"
            ? { slotId, status: "completed" }
            : { slotId, status: "expired", reason: "Queue hours ended" };
        emitToSlot(slotId, "queue:slot-status", payload);
        emitToDept(slot.department_id, "queue:slot-status", payload);

        if (newStatus === "completed") completedCount += 1;
        else expiredCount += 1;
      } catch (entryError) {
        await conn.rollback();
        console.error(`[queueExpirySweeper] Failed to settle slot ${slotId}:`, entryError);
      } finally {
        conn.release();
      }
    }

    if (expiredCount > 0 || completedCount > 0) {
      console.log(
        `[queueExpirySweeper] Hours ended for ${candidates.length} queue${candidates.length === 1 ? "" : "s"}: ${expiredCount} expired (still serving), ${completedCount} completed (nobody left)`,
      );
    }
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
