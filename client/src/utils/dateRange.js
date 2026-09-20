import { getManilaTodayAsLocalDate } from "./dateTime";

export function getTodayRange(now = getManilaTodayAsLocalDate()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// Week starts on Sunday, matching the appointment booking calendar elsewhere
// in the app. `weekOffset` shifts by whole weeks -- 0 (default) is the
// current calendar week, 1 is next week.
export function getWeekRange(now = getManilaTodayAsLocalDate(), weekOffset = 0) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

export function getNextWeekRange(now = getManilaTodayAsLocalDate()) {
  return getWeekRange(now, 1);
}

export function getMonthRange(now = getManilaTodayAsLocalDate()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function isWithinRange(dateStr, range) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d >= range.start && d <= range.end;
}

// Filters a list of items with a date field (default "date", "YYYY-MM-DD")
// down to a named range -- "today", "week", "nextWeek", "month", or "all"
// (no filtering). "month" is kept working here even though
// prof-appointments.jsx/stud-appointment-status.jsx no longer offer it in
// their own option lists -- adm-appointment.jsx's range control still does.
export function filterByRange(items, rangeKey, dateField = "date") {
  if (rangeKey === "all") return items;
  const range =
    rangeKey === "today" ? getTodayRange() :
    rangeKey === "nextWeek" ? getNextWeekRange() :
    rangeKey === "month" ? getMonthRange() :
    getWeekRange();
  return items.filter((item) => isWithinRange(item[dateField], range));
}
