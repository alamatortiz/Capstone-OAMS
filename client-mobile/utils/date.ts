// Shared date helpers for the mobile client. OAMS is Philippines-only
// (Asia/Manila, fixed UTC+8), so "local" on a correctly-set device is Manila
// time; the formatters still pin to Asia/Manila explicitly to stay correct if a
// device's own timezone is mis-set, matching web's client/src/utils/dateTime.js.

// Formats a Date as "YYYY-MM-DD" from its LOCAL calendar parts. Use this for any
// value coming out of a <DateTimePicker mode="date"> (which yields a local-
// midnight Date): `toISOString().slice(0,10)` would shift it to the previous day
// at UTC+8 because local midnight is 16:00 the day before in UTC.
export const toLocalYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

// Parses a "YYYY-MM-DD" string into a LOCAL-midnight Date (inverse of
// toLocalYMD). `new Date("2026-08-29")` parses as UTC midnight instead.
export const fromLocalYMD = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Renders an API timestamp/date value as a Manila calendar date. Accepts a full
// ISO string ("2026-08-28T05:30:00.000Z"), a date-only ISO string, or a bare
// "YYYY-MM-DD"; returns the input unchanged if it can't be parsed.
export const formatManilaDate = (
  value?: string | null,
  opts: Intl.DateTimeFormatOptions = {},
): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  });
};

// Renders an API timestamp as a Manila wall-clock time ("3:45 PM"). Same
// input contract as formatManilaDate; mirrors web's formatManilaTime.
export const formatManilaTime = (
  value?: string | null,
  opts: Intl.DateTimeFormatOptions = {},
): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...opts,
  });
};

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Returns the Manila calendar date (YYYY-MM-DD) for a given instant,
// defaulting to now. Use this instead of comparing Date objects for "is this
// today" checks -- the device's local "today" can differ from Manila's near
// the day boundary. Mirrors web's dateTime.js getManilaDateString.
export const getManilaDateString = (date: Date = new Date()): string =>
  MANILA_DATE_FORMATTER.format(date);

const DAY_ORDER_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The next upcoming calendar date (as "YYYY-MM-DD") for a weekday name,
// anchored to a "YYYY-MM-DD" today string -- never a date already passed
// (today itself counts as "next" if it's the matching weekday). Mirrors
// web's adm-professor-availability.jsx/stud-professor-schedules.jsx helper
// of the same name, so both mobile screens showing a professor's weekly
// consultation schedule label days identically to web.
export const nextOccurrenceDateStr = (dayName: string, anchorStr: string): string => {
  const [y, m, d] = anchorStr.split('-').map(Number);
  const anchor = new Date(y, (m || 1) - 1, d || 1);
  const diff = (DAY_ORDER_FULL.indexOf(dayName) - anchor.getDay() + 7) % 7;
  anchor.setDate(anchor.getDate() + diff);
  return toLocalYMD(anchor);
};
