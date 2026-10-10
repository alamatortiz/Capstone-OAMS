// Shared date-range filtering helpers for the mobile client. Mirrors
// client/src/utils/dateRange.js -- keep the two in sync when either changes.
// (client-mobile's admin_appointment.tsx keeps its own separate,
// un-migrated copy of this same logic for now -- admin is out of scope for
// this change, same as on web.)

import { fromLocalYMD, getManilaDateString } from './date';

export interface DateRange {
  start: Date;
  end: Date;
}

// Today's Manila calendar date as a local-midnight Date -- the mobile
// equivalent of web's dateTime.js getManilaTodayAsLocalDate. Keeps "today"
// pinned to Manila even if a device's own timezone/clock is mis-set.
function getManilaTodayAsLocalDate(): Date {
  return fromLocalYMD(getManilaDateString());
}

export function getTodayRange(now: Date = getManilaTodayAsLocalDate()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// Week starts on Sunday, matching the appointment booking calendar elsewhere
// in the app. `weekOffset` shifts by whole weeks -- 0 (default) is the
// current calendar week, 1 is next week.
export function getWeekRange(now: Date = getManilaTodayAsLocalDate(), weekOffset: number = 0): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

export function getNextWeekRange(now: Date = getManilaTodayAsLocalDate()): DateRange {
  return getWeekRange(now, 1);
}

export function isWithinRange(dateStr: string, range: DateRange): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return d >= range.start && d <= range.end;
}

export type RangeKey = 'today' | 'week' | 'nextWeek' | 'all';

// Filters a list of items with a "date" field ("YYYY-MM-DD") down to a named
// range -- "today", "week", "nextWeek", or "all" (no filtering). Mirrors
// web's client/src/utils/dateRange.js filterByRange, minus "month" (neither
// screen that uses this offers "This Month" anymore) and minus the
// configurable dateField param (neither caller needs a field other than
// "date", and a fixed `{ date: string }` constraint -- matching what
// student_appointment_status.tsx's own local version used before this file
// replaced it -- type-checks cleanly against concrete Appointment interfaces,
// unlike a generic Record<string, unknown> bound.
export function filterByRange<T extends { date: string }>(items: T[], rangeKey: RangeKey): T[] {
  if (rangeKey === 'all') return items;
  const range =
    rangeKey === 'today' ? getTodayRange() : rangeKey === 'nextWeek' ? getNextWeekRange() : getWeekRange();
  return items.filter((item) => isWithinRange(item.date, range));
}
