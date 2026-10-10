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

// Converts a bare "HH:MM" wall-clock string (e.g. a queue slot's start_time/
// end_time) into 12-hour "h:MM AM/PM". Unlike formatManilaTime, this does NOT
// parse the input as a Date or apply a timezone conversion -- a bare "HH:MM"
// has no date/timezone context, and is already Manila wall-clock time by the
// time it reaches the client.
export function formatTimeString(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Splits a department's free-text office-hours string (e.g. "Monday - Friday:
// 8 AM - 5 PM, Saturday: 8 AM - 12 PM") into { day, time } chip entries for
// the student/professor dashboard office-hours cards. Splits only on a comma
// followed by a weekday name (the actual entry delimiter) rather than any
// capital letter -- a naive "any capital letter" split would mis-split free
// text like "Monday: 9-11, By Appointment" on "By".
export function parseOfficeHoursSchedule(hoursStr) {
  if (!hoursStr) return [];
  const weekdayNames = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";
  return hoursStr.split(new RegExp(`,\\s*(?=(?:${weekdayNames})\\b)`)).map((entry) => {
    const colonIdx = entry.indexOf(": ");
    if (colonIdx === -1) return { day: entry.trim(), time: "" };
    return {
      day: entry.substring(0, colonIdx).trim(),
      time: entry.substring(colonIdx + 2).trim(),
    };
  });
}

