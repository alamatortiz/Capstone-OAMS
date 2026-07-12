import "./CalendarGrid.css";
import { getManilaDateString, getManilaTodayAsLocalDate } from "../utils/dateTime";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Props:
 *   year        {number}   — displayed year
 *   month       {number}   — displayed month (1-based)
 *   days        {Array}    — [{ date: "YYYY-MM-DD", status: "available"|"blocked"|"unavailable", reason?: string }]
 *   selectedDate {string}  — currently selected date ("YYYY-MM-DD") or ""
 *   onDateClick  {fn}      — (date, status) => void — only fires for "available" dates
 *   onPrevMonth  {fn}      — () => void
 *   onNextMonth  {fn}      — () => void
 *   disablePast  {bool}    — gray out dates before today (default true)
 *   loading      {bool}    — show skeleton while data loads
 */
export default function CalendarGrid({
  year,
  month,
  days = [],
  selectedDate = "",
  onDateClick,
  onPrevMonth,
  onNextMonth,
  disablePast = true,
  loading = false,
}) {
  const today = getManilaTodayAsLocalDate();
  const todayStr = getManilaDateString();

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const dayMap = {};
  days.forEach((d) => { dayMap[d.date] = d; });

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = dayMap[dateStr] ?? { date: dateStr, status: "unavailable" };
    const dateObj = new Date(year, month - 1, d);
    const isPast = disablePast && dateObj < today;
    cells.push({ ...dayData, isPast });
  }

  const handleClick = (cell) => {
    if (!cell || cell.isPast || cell.status !== "available") return;
    onDateClick?.(cell.date, cell.status);
  };

  return (
    <div className="cg-wrapper">
      {/* Month navigation */}
      <div className="cg-header">
        <button className="cg-nav-btn" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeftIcon />
        </button>
        <span className="cg-month-label">{MONTH_NAMES[month - 1]} {year}</span>
        <button className="cg-nav-btn" onClick={onNextMonth} aria-label="Next month">
          <ChevronRightIcon />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="cg-dow-row">
        {DAYS_OF_WEEK.map((d) => (
          <span key={d} className="cg-dow">{d}</span>
        ))}
      </div>

      {/* Date cells */}
      <div className="cg-grid">
        {loading
          ? Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="cg-cell cg-cell--skeleton" />
            ))
          : cells.map((cell, i) => {
              if (!cell) return <div key={i} className="cg-cell cg-cell--empty" />;

              const isSelected = cell.date === selectedDate;
              const isToday = cell.date === todayStr;
              let mod = "";
              if (cell.isPast) mod = "cg-cell--past";
              else if (cell.status === "available") mod = "cg-cell--available";
              else if (cell.status === "blocked") mod = "cg-cell--blocked";
              else mod = "cg-cell--unavailable";

              return (
                <div
                  key={i}
                  className={`cg-cell ${mod}${isSelected ? " cg-cell--selected" : ""}${isToday ? " cg-cell--today" : ""}`}
                  onClick={() => handleClick(cell)}
                  title={
                    cell.status === "blocked"
                      ? `Unavailable${cell.reason ? `: ${cell.reason}` : ""}`
                      : cell.status === "available" && !cell.isPast
                      ? "Available — click to select"
                      : undefined
                  }
                >
                  <span className="cg-day-num">{parseInt(cell.date.split("-")[2], 10)}</span>
                  {cell.status === "available" && !cell.isPast && (
                    <span className="cg-dot cg-dot--green" />
                  )}
                  {cell.status === "blocked" && (
                    <span className="cg-dot cg-dot--red" />
                  )}
                </div>
              );
            })}
      </div>

      {/* Legend */}
      <div className="cg-legend">
        <span className="cg-legend-item"><span className="cg-dot cg-dot--green" />Available</span>
        <span className="cg-legend-item"><span className="cg-dot cg-dot--red" />Blocked</span>
        <span className="cg-legend-item"><span className="cg-dot cg-dot--gray" />No availability</span>
      </div>
    </div>
  );
}
