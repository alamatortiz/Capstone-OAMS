// Computes the student-facing position/estimated-wait display for a queue
// ticket. `rawPosition` is the SQL count-of-waiting-ahead-inclusive value,
// which is meaningfully 0 once a ticket has been called (no 'waiting' rows
// remain at or before it) -- that 0 must not be coerced back into "next in
// line" the way a naive `|| 1` fallback would.
//
// `avgServiceMinutes` is the slot's own historical average (called_at ->
// completed_at over its 'completed' entries), the same figure already shown
// to admins in the queue-hosting monitor view -- using it here too keeps the
// student-facing ETA from silently diverging from what the admin sees for
// the same queue. Falls back to a flat 5 min/person guess only when there's
// no history yet (a brand-new slot with zero completed entries).
function getQueueDisplayInfo({ status, rawPosition, arrivedAt = null, avgServiceMinutes = null }) {
  if (status === "serving") {
    return {
      position: null,
      estimatedWait: arrivedAt
        ? "You are now being served"
        : "Please proceed to the designated location",
    };
  }
  const position = rawPosition ?? 1;
  if (position <= 1) {
    return { position, estimatedWait: "You're next!" };
  }
  const perPersonMinutes =
    avgServiceMinutes != null && avgServiceMinutes > 0 ? avgServiceMinutes : 5;
  return {
    position,
    estimatedWait: `~${Math.round((position - 1) * perPersonMinutes)} min`,
  };
}

module.exports = { getQueueDisplayInfo };
