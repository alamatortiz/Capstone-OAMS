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

    // A slot from a date strictly before today is always past its hours,
    // regardless of end_time -- without that first branch, a slot that
    // somehow survived past midnight (a missed sweep, a server restart at
    // just the wrong moment, etc.) would never match `slot_date = today`
    // again on any later sweep and would stay stuck at 'open'/'paused'
    // forever. Today's own slots still need the end_time check so ones
    // still within their posted hours are left alone.
    const [candidates] = await pool.query(
      `SELECT qs.slot_id
       FROM queue_slots qs
       WHERE qs.status IN ('open', 'paused')
         AND (qs.slot_date < ? OR (qs.slot_date = ? AND qs.end_time <= ?))`,
      [manilaToday, manilaToday, manilaNow],
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

// Housekeeping for the two short-lived tables the on-site queueing redesign
// introduced. Neither affects correctness -- expiry is always evaluated in
// the query that reads them, so a stale row is already inert -- this just
// stops them growing without bound (a busy queue mints a token every 45s).
//
// Tokens are kept a day past expiry so a "why didn't my code work?" question
// can still be answered from the data; credits are kept 30 days because
// consumed ones are the audit trail for why a student jumped the line.
async function cleanupExpiredArtifacts() {
  try {
    const [tokens] = await pool.query(
      `DELETE FROM queue_slot_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY`,
    );
    const [credits] = await pool.query(
      `DELETE FROM queue_priority_credits
        WHERE (consumed_at IS NOT NULL AND consumed_at < NOW() - INTERVAL 30 DAY)
           OR (consumed_at IS NULL AND expires_at < NOW() - INTERVAL 30 DAY)`,
    );
    if (tokens.affectedRows || credits.affectedRows) {
      console.log(
        `[queueExpirySweeper] Cleaned ${tokens.affectedRows} stale join token${tokens.affectedRows === 1 ? "" : "s"}, ${credits.affectedRows} old priority credit${credits.affectedRows === 1 ? "" : "s"}`,
      );
    }
  } catch (error) {
    console.error("[queueExpirySweeper] Artifact cleanup failed:", error);
  }
}

function startExpirySweeper() {
  // Deliberately not firing an immediate sweep on boot -- see the identical
  // note in queueNoShowSweeper.js. End-time granularity is minutes-scale, so
  // waiting for the first interval tick costs nothing functionally.
  const slotTimer = setInterval(sweepExpiredSlots, SWEEP_INTERVAL_MS);
  // Housekeeping runs far less often than the slot sweep -- nothing depends
  // on its timeliness.
  const cleanupTimer = setInterval(cleanupExpiredArtifacts, 60 * 60 * 1000);
  return { slotTimer, cleanupTimer };
}

module.exports = { startExpirySweeper, sweepExpiredSlots, cleanupExpiredArtifacts };
