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

/**
 * Converts a MySQL TIME string (HH:MM:SS) to 12-hour format (e.g. "2:00 PM").
 */
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${suffix}`;
}

// Expects a real Date object -- callers pass `new Date(someTimestamp)`.
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

module.exports = {
  getManilaDateString,
  getManilaTimeString,
  isSameManilaDay,
  formatTime12h,
  formatRelativeTime,
};
