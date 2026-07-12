// Timestamp formatters that always render in Philippine time (Asia/Manila),
// regardless of the viewer's browser/OS timezone.

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the Manila calendar date (YYYY-MM-DD) for a given instant, defaulting
// to now. Use this instead of comparing `Date` objects/`toDateString()` for
// "is this today" checks — the browser's local "today" can differ from
// Manila's near the day boundary.
export function getManilaDateString(date = new Date()) {
  return MANILA_DATE_FORMATTER.format(date);
}

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Returns the current Manila wall-clock time as "HH:MM" (24h) -- directly
// comparable to a native <input type="time"> value. Mirrors
// server/utils/dateTime.js's getManilaTimeString (which includes seconds
// for TIME-column comparisons); this one deliberately omits seconds to
// match the time input's value format.
export function getManilaTimeString(date = new Date()) {
  return MANILA_TIME_FORMATTER.format(date);
}

// Adds `minutesToAdd` to a "HH:MM" time string, clamping at "23:59" instead
// of rolling into the next day -- queue windows are always same-day
// (slot_date is fixed to "today" server-side), so wrapping would silently
// misrepresent the window instead of extending it.
export function addMinutesClampedToDay(timeStr, minutesToAdd) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const totalMinutes = Math.min(hours * 60 + minutes + minutesToAdd, 23 * 60 + 59);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Returns today's Manila calendar date as a local-midnight `Date` object
// (year, 0-indexed month, day) — a safe seed for calendar math (week/month
// range boundaries, weekday lookups) that stays internally consistent
// because everything downstream is built from local-Date arithmetic too.
// Use this instead of `new Date()` wherever "today" drives calendar
// boundaries — the viewer's device timezone must never be the source of
// truth for what day it is.
export function getManilaTodayAsLocalDate() {
  const [year, month, day] = getManilaDateString().split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Returns tomorrow's Manila calendar date as "YYYY-MM-DD" -- the safe way to
// compute a "must be at least 1 day ahead" minimum date. Do NOT use
// `new Date(Date.now() + 86400000).toISOString()` for this: `.toISOString()`
// returns the UTC calendar date, which still lags Manila's by one day during
// Manila-local 12:00 AM-7:59 AM, silently allowing same-day selections.
export function getManilaTomorrowDateString() {
  const tomorrow = getManilaTodayAsLocalDate();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatManilaDate(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export function formatManilaTime(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

export function formatManilaDateTime(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

export function formatManilaTimeAgo(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
