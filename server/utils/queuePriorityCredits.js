// Compensation for a student the office failed to reach before closing
// (2026-09-30 panel review: "5 slots for this day but only 2 catered --
// what will happen to the 3 students?").
//
// The deliberate shape of this feature: a credit RESERVES NOTHING. It does
// not hold a spot, does not auto-enrol them into tomorrow's queue, and does
// not exist as a pending entry anywhere. It sits inert until the student
// physically comes back and scans in again, at which point it moves them to
// the front and is spent. If they never return it just expires.
//
// That matters because the same panel removed online reservation entirely.
// Anything that held a place for an absent student would quietly reintroduce
// it -- and worse, if they didn't turn up for a spot they never asked for,
// the no-show strike system would punish them for it.

const PRIORITY_CREDIT_DAYS = 3;

// Claims one credit for this student+service, if any is live. Must run
// inside the join transaction, under the slot row lock, so two concurrent
// scans can't both spend the same credit.
//
// Returns the claimed credit row, or null. Picks the OLDEST live credit
// first (FIFO) so repeated failures are repaid in the order they happened.
async function claimPriorityCredit(conn, { studentId, serviceId }) {
  const [[credit]] = await conn.query(
    `SELECT credit_id
       FROM queue_priority_credits
      WHERE student_id = ? AND service_id = ?
        AND consumed_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE`,
    [studentId, serviceId],
  );
  return credit ?? null;
}

// Marks the credit spent and links it to the entry that used it, so the
// history reads end-to-end: this closure caused this credit, which bought
// this ticket its place.
async function consumePriorityCredit(conn, { creditId, queueId }) {
  await conn.query(
    `UPDATE queue_priority_credits
        SET consumed_at = NOW(), consumed_queue_id = ?
      WHERE credit_id = ? AND consumed_at IS NULL`,
    [queueId, creditId],
  );
}

module.exports = { PRIORITY_CREDIT_DAYS, claimPriorityCredit, consumePriorityCredit };
