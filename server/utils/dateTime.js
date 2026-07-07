// Manila calendar-date helpers. `.toISOString()` always returns UTC, which
// silently miscalculates "today" near the UTC/Manila day boundary — use
// these instead for any date-boundary comparison.

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getManilaDateString(date = new Date()) {
  return MANILA_DATE_FORMATTER.format(date);
}

function isSameManilaDay(a, b) {
  return getManilaDateString(a) === getManilaDateString(b);
}

module.exports = { getManilaDateString, isSameManilaDay };
