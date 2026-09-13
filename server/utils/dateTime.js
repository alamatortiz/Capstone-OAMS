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

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

// Converts a plain "YYYY-MM-DD" string (as sent by an <input type="date">
// or a mobile date picker) into the UTC instant for Manila midnight on that
// date -- the same `${dateStr}T00:00:00+08:00` anchor already used elsewhere
// in this codebase for "today" boundaries, just accepting an arbitrary
// caller-supplied date instead of only today's. Returns null for anything
// malformed or not a real calendar date, so a filter endpoint can treat an
// invalid value the same as "not provided" instead of letting an Invalid
// Date reach a SQL parameter.
function manilaDayStartUTC(dateStr) {
  if (typeof dateStr !== "string" || !DATE_STR_RE.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The exclusive upper bound for the same date -- Manila midnight at the
// start of the NEXT day, so a range check like `event_time < this` correctly
// includes every instant during dateStr's Manila-local day regardless of
// exact time, without the off-by-a-few-hours risk of a literal "23:59:59".
function manilaDayEndExclusiveUTC(dateStr) {
  const start = manilaDayStartUTC(dateStr);
  return start ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : null;
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
  manilaDayStartUTC,
  manilaDayEndExclusiveUTC,
};
