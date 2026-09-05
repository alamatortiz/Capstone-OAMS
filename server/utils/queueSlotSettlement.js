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

// Locks a queue_slots row and checks the calling admin may manage it -- shared
// by every admin queue-hosting mutation route (pause/resume/close/call-next/
// mark-arrived/serve/skip). Scopes on qs.department_id (always set) rather than
// joining services, so a Universal Service Queue slot (NULL service_id) still
// resolves. On failure, rolls back and writes the 404/403 response itself,
// returning null so the caller can just `if (!slot) return;`. Returns
// ({ slot_id, status, department_id, is_universal, service_name }) on success;
// service_name is null for a universal slot.
async function getOwnedSlotOrRespond(conn, res, { slotId, deptId }) {
  const [[slot]] = await conn.query(
    `SELECT qs.slot_id, qs.status, qs.department_id, qs.is_universal,
            CASE WHEN qs.is_universal THEN 'Universal Service Queue' ELSE s.service_name END AS service_name
     FROM queue_slots qs
     LEFT JOIN services s ON qs.service_id = s.service_id
     WHERE qs.slot_id = ? FOR UPDATE`,
    [slotId],
  );
  if (!slot) {
    await conn.rollback();
    res.status(404).json({ error: "Queue slot not found" });
    return null;
  }
  if (slot.department_id !== deptId) {
    await conn.rollback();
    res.status(403).json({ error: "You can only manage queues for your own department" });
    return null;
  }
  return slot;
}

module.exports = { settleSlotAfterEntryChange, getOwnedSlotOrRespond };
