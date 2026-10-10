// Anti-abuse for queueing (2026-09-30 panel review: "Provide anti-spam /
// anti-abuse features for the queue").
//
// The abuse this targets is a student taking a number, wandering off, and
// repeating -- each cycle burns a slot and pushes everyone behind them back.
// Note the on-site QR requirement already raises the cost a lot (they have
// to physically be at the counter to scan each time), so this is the second
// line of defence rather than the only one.
//
// Strikes are DERIVED, never stored in a counter column. Counting
// queues.status='no_show' rows for today means the number can't drift away
// from the entries that justify it, and "undoing" a strike is impossible by
// construction -- there's nothing to decrement. The only stored thing is the
// exception: a host forgiving someone (queue_block_overrides).

const STRIKE_LIMIT = 3;

// A host clearing a block sets a watermark: only no-shows recorded AFTER the
// most recent override count toward the next block. Without this a forgiven
// student would be re-blocked by the very strikes that were just forgiven,
// making the override useless.
//
// The comparison is strictly `>`, and both columns are second-precision
// TIMESTAMPs, so a no-show recorded in the SAME second as the override is
// treated as forgiven. That one-second ambiguity is resolved in the
// student's favour deliberately: this gates access to a service they're
// entitled to, so an off-by-one here should under-punish, not over-punish.
//
// Manila date, not UTC: "three times today" has to mean the office's day, or
// the limit would reset mid-afternoon local time.
async function getStrikeState(db, studentId) {
  const [[row]] = await db.query(
    `SELECT
       (SELECT MAX(cleared_at) FROM queue_block_overrides
         WHERE student_id = ?
           AND block_date = DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
       ) AS cleared_at`,
    [studentId],
  );
  const clearedAt = row?.cleared_at ?? null;

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS strikes
       FROM queues
      WHERE student_id = ?
        AND status = 'no_show'
        AND DATE(CONVERT_TZ(completed_at, '+00:00', '+08:00'))
            = DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
        ${clearedAt ? "AND completed_at > ?" : ""}`,
    clearedAt ? [studentId, clearedAt] : [studentId],
  );

  const strikes = Number(countRow?.strikes ?? 0);
  return {
    strikes,
    limit: STRIKE_LIMIT,
    blocked: strikes >= STRIKE_LIMIT,
    clearedAt,
  };
}

// Convenience for the join path: returns null when the student may proceed,
// or a ready-to-send error payload when they're blocked.
async function getBlockRejection(db, studentId) {
  const state = await getStrikeState(db, studentId);
  if (!state.blocked) return null;
  return {
    error:
      `You've been marked as a no-show ${state.strikes} times today, so joining is paused ` +
      `until tomorrow. Ask the staff at the counter if you need this lifted.`,
    code: "QUEUE_BLOCKED_NO_SHOWS",
    strikes: state.strikes,
    limit: state.limit,
  };
}

module.exports = { STRIKE_LIMIT, getStrikeState, getBlockRejection };
