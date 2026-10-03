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

// ── Canonical waiting-list ordering ────────────────────────────────────────
//
// queue_number is a stable DISPLAY LABEL and deliberately cannot express
// ordering: uq_queue_slot_number(slot_id, queue_number) makes renumbering a
// deadlock farm, so priority and relays are expressed by these three columns
// instead:
//   priority_rank DESC -- a priority credit (rank 1) jumps the line. Issued
//                         when a queue closed before reaching the student.
//   created_at    ASC  -- otherwise plain first-come. A relayed entry keeps
//                         its ORIGINAL created_at, so moving someone to the
//                         right queue doesn't send them to the back.
//   queue_id      ASC  -- deterministic tiebreak for same-second joins.
//
// Both helpers below are generated from this one list so the sort order and
// the position count can never disagree. They must stay in lockstep: if the
// ORDER BY says one thing and the position subquery says another, a student
// is served in one order and shown a position computed from a different one.
//
// Aliases are always code-controlled literals (never user input), so string
// interpolation here carries no injection risk.
const QUEUE_ORDER_COLUMNS = [
  { column: "priority_rank", direction: "DESC" },
  { column: "created_at", direction: "ASC" },
  { column: "queue_id", direction: "ASC" },
];

function queueOrderBy(alias = "q") {
  return QUEUE_ORDER_COLUMNS.map(
    ({ column, direction }) => `${alias}.${column} ${direction}`,
  ).join(", ");
}

// "`inner` sits at or before `outer` in the canonical order" -- the predicate
// behind every position count (`SELECT COUNT(*) ... WHERE <this>`), which is
// why the final column uses <= rather than <: a ticket counts itself, so the
// front of the line is position 1 rather than 0.
function queueAtOrBeforePredicate(inner, outer) {
  const clauses = QUEUE_ORDER_COLUMNS.map(({ column, direction }, index) => {
    const ties = QUEUE_ORDER_COLUMNS.slice(0, index)
      .map((tie) => `${inner}.${tie.column} = ${outer}.${tie.column}`)
      .join(" AND ");
    const isLast = index === QUEUE_ORDER_COLUMNS.length - 1;
    // DESC columns rank higher when greater; ASC when lesser.
    const operator = direction === "DESC" ? (isLast ? ">=" : ">") : isLast ? "<=" : "<";
    const compare = `${inner}.${column} ${operator} ${outer}.${column}`;
    return ties ? `(${ties} AND ${compare})` : `(${compare})`;
  });
  return `(${clauses.join("\n       OR ")})`;
}

module.exports = {
  getQueueDisplayInfo,
  QUEUE_ORDER_COLUMNS,
  queueOrderBy,
  queueAtOrBeforePredicate,
};
