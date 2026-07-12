// Manila calendar-date helpers. `.toISOString()` always returns UTC, which
// silently miscalculates "today" near the UTC/Manila day boundary — use
// these instead for any date-boundary comparison.

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getManilaDateString(date = new Date()) {
  return MANILA_DATE_FORMATTER.format(date);
}

// Returns the Manila wall-clock time (HH:MM:SS) for a given instant — use
// this instead of MySQL's CURTIME(), which reflects the DB server's own
// (UTC) session time_zone, not Manila's.
function getManilaTimeString(date = new Date()) {
  return MANILA_TIME_FORMATTER.format(date);
}

function isSameManilaDay(a, b) {
  return getManilaDateString(a) === getManilaDateString(b);
}

module.exports = { getManilaDateString, getManilaTimeString, isSameManilaDay };
