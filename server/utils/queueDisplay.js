// Computes the student-facing position/estimated-wait display for a queue
// ticket. `rawPosition` is the SQL count-of-waiting-ahead-inclusive value,
// which is meaningfully 0 once a ticket has been called (no 'waiting' rows
// remain at or before it) -- that 0 must not be coerced back into "next in
// line" the way a naive `|| 1` fallback would.
function getQueueDisplayInfo(status, rawPosition) {
  if (status === "serving") {
    return { position: null, estimatedWait: "Please proceed to the designated location" };
  }
  const position = rawPosition ?? 1;
  return {
    position,
    estimatedWait: position > 1 ? `~${(position - 1) * 5} min` : "You're next!",
  };
}

module.exports = { getQueueDisplayInfo };
