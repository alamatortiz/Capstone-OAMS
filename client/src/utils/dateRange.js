import { getManilaTodayAsLocalDate } from "./dateTime";

// Week starts on Sunday, matching the appointment booking calendar elsewhere in the app.
export function getWeekRange(now = getManilaTodayAsLocalDate()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
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
// down to a named range -- "week", "month", or "all" (no filtering).
export function filterByRange(items, rangeKey, dateField = "date") {
  if (rangeKey === "all") return items;
  const range = rangeKey === "month" ? getMonthRange() : getWeekRange();
  return items.filter((item) => isWithinRange(item[dateField], range));
}
