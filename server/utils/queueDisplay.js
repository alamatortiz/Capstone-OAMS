// Computes the student-facing position/estimated-wait display for a queue
// ticket. `rawPosition` is the SQL count-of-waiting-ahead-inclusive value,
// which is meaningfully 0 once a ticket has been called (no 'waiting' rows
// remain at or before it) -- that 0 must not be coerced back into "next in
// line" the way a naive `|| 1` fallback would.
//
// `avgServiceMinutes` is the slot's own admin-configured service time
// (queue_slots.service_time_minutes), the same figure shown to admins in the
// queue-hosting monitor view -- using it here too keeps the student-facing
// ETA from diverging from what the admin sees for the same queue. Falls back
// to a flat 5 min/person guess only defensively, for pre-migration rows.
function getQueueDisplayInfo({ status, rawPosition, arrivedAt = null, avgServiceMinutes = null }) {
  if (status === "serving") {
    return {
      position: null,
      estimatedWait: arrivedAt
        ? "None, wait for the process to finish"
        : "None, proceed to the designated location",
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
