const { getManilaDateString, getManilaTimeString } = require("./dateTime");

// The one rule for how a stopped queue ends up labelled, shared by the close
// route (evaluated at stop time) and settleSlotAfterEntryChange (evaluated
// again once the professors finish the students who were already passed to
// them) so the two can never disagree.
//
// 'completed' only when nobody was force-cancelled, nobody is still being
// handled, and real service actually happened -- "zero activity isn't an
// accomplishment" (matches the Accomplished-Queues analytics count).
// Everything else is 'closed'.
function resolveClosedStatus({ officeCancelled, laneUnserved, served }) {
  return officeCancelled === 0 && laneUnserved === 0 && served > 0 ? "completed" : "closed";
}

// After a queue entry stops being waiting/serving (served, left, voided as a
// no-show, or cancelled), the owning slot may need to settle:
//   - a 'full' slot reopens once a seat frees up under the daily cap, as long
//     as it is still TODAY and its posted hours haven't ended;
//   - a 'full'/'expired' slot with nobody left waiting/serving -> 'completed';
//   - a 'closed' slot (stopped while professors still had passed students)
//     whose last passed student is now finished -> resolveClosedStatus().
// Runs against whatever query executor the caller passes (pool, or an
// in-flight transaction connection) so callers keep control of commit timing
// and socket emission.
//
// The slot row is locked first, then the counts are taken as LOCKING reads.
// They used to be plain subqueries inside the slot's SELECT ... FOR UPDATE --
// but a locking clause doesn't extend to nested subqueries, so those were
// consistent (snapshot) reads: a transaction that had done any earlier plain
// read saw stale counts, and two lines finishing at the same moment could
// each think the other was still unserved, leaving the slot stuck forever.
async function settleSlotAfterEntryChange(db, slotId) {
  const [[slot]] = await db.query(
    `SELECT status, max_capacity, end_time, slot_date
     FROM queue_slots WHERE slot_id = ? FOR UPDATE`,
    [slotId],
  );
  if (!slot) return null;

  const [[counts]] = await db.query(
    `SELECT
       COALESCE(SUM(status IN ('waiting', 'serving', 'completed')), 0) AS claimed,
       COALESCE(SUM(status IN ('waiting', 'serving')), 0) AS unserved,
       COALESCE(SUM(status = 'completed'), 0) AS served,
       COALESCE(SUM(status = 'cancelled' AND cancelled_by = 'system_not_entertained'), 0) AS force_cancelled
     FROM queues WHERE slot_id = ? FOR UPDATE`,
    [slotId],
  );
  const claimed = Number(counts.claimed);
  const unserved = Number(counts.unserved);

  if (
    slot.status === "full" &&
    claimed < slot.max_capacity &&
    getManilaDateString(slot.slot_date) === getManilaDateString() &&
    getManilaTimeString() <= slot.end_time
  ) {
    await db.query(
      `UPDATE queue_slots SET status = 'open', close_reason = NULL WHERE slot_id = ?`,
      [slotId],
    );
    return { newStatus: "open" };
  }

  if ((slot.status === "full" || slot.status === "expired") && unserved === 0) {
    await db.query(
      `UPDATE queue_slots SET status = 'completed' WHERE slot_id = ?`,
      [slotId],
    );
    return { newStatus: "completed" };
  }

  if (slot.status === "closed" && unserved === 0) {
    const newStatus = resolveClosedStatus({
      officeCancelled: Number(counts.force_cancelled),
      laneUnserved: 0,
      served: Number(counts.served),
    });
    if (newStatus === "completed") {
      await db.query(
        `UPDATE queue_slots SET status = 'completed' WHERE slot_id = ?`,
        [slotId],
      );
      return { newStatus };
    }
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
// Routes derive slotId with parseInt(), which yields NaN for a non-numeric
// path segment. mysql2 then serialises NaN into the SQL as the bare token
// `NaN`, which MySQL parses as a column identifier -- so a bad :slotId came
// back as a 500 "Unknown column 'NaN' in 'where clause'" instead of a clean
// 404. Reject it before it ever reaches a query.
function isValidSlotId(slotId) {
  return Number.isInteger(slotId) && slotId > 0;
}

async function getOwnedSlotOrRespond(conn, res, { slotId, deptId }) {
  if (!isValidSlotId(slotId)) {
    await conn.rollback();
    res.status(404).json({ error: "Queue slot not found" });
    return null;
  }
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

module.exports = { settleSlotAfterEntryChange, resolveClosedStatus, getOwnedSlotOrRespond, isValidSlotId };
