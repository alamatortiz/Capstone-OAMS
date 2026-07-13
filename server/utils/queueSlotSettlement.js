const { getManilaTimeString } = require("./dateTime");

// After a queue entry stops being waiting/serving (served, left, or voided
// as a no-show), the owning slot may need to settle: a 'full' slot reopens
// once a seat frees up under the daily cap (as long as its posted hours
// haven't ended yet), or a 'full'/'expired' slot with nobody left
// waiting/serving settles into 'completed'. Runs against whatever query
// executor the caller passes (pool, or an in-flight transaction connection)
// so callers keep control of commit timing and socket emission.
async function settleSlotAfterEntryChange(db, slotId) {
  const [[slot]] = await db.query(
    `SELECT qs.status, qs.max_capacity, qs.end_time,
       (SELECT COUNT(*) FROM queues q WHERE q.slot_id = qs.slot_id AND q.status IN ('waiting', 'serving', 'completed')) AS claimed,
       (SELECT COUNT(*) FROM queues q2 WHERE q2.slot_id = qs.slot_id AND q2.status IN ('waiting', 'serving')) AS unserved
     FROM queue_slots qs WHERE qs.slot_id = ? FOR UPDATE`,
    [slotId],
  );
  if (!slot) return null;

  if (
    slot.status === "full" &&
    slot.claimed < slot.max_capacity &&
    getManilaTimeString() <= slot.end_time
  ) {
    await db.query(
      `UPDATE queue_slots SET status = 'open', close_reason = NULL WHERE slot_id = ?`,
      [slotId],
    );
    return { newStatus: "open" };
  }

  if ((slot.status === "full" || slot.status === "expired") && slot.unserved === 0) {
    await db.query(
      `UPDATE queue_slots SET status = 'completed' WHERE slot_id = ?`,
      [slotId],
    );
    return { newStatus: "completed" };
  }

  return null;
}

module.exports = { settleSlotAfterEntryChange };
