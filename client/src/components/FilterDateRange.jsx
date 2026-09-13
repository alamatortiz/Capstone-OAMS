/**
 * A start/end date-range filter, styled to slot into the same .filters-grid
 * layout FilterSelect uses today -- mirrors its prop shape (id/label/
 * labelClassName), but this renders no CSS of its own (same as FilterSelect):
 * each consuming page scopes .filter-date-range/.filter-date-input/etc under
 * its own container class, matching how .filter-select is styled per-page.
 *
 * Deliberately renders no decorative calendar icon next to the native
 * <input type="date"> -- the browser already draws its own calendar-icon
 * indicator in that exact corner, and overlaying a custom one without
 * suppressing the native one first would reproduce the adm-queue-hosting
 * duplicate-clock-icon bug in brand-new code.
 */
import { getManilaDateString } from "../utils/dateTime";

export default function FilterDateRange({
  id,
  label = "Date Range",
  labelClassName = "filter-label",
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onClear,
  disabled = false,
}) {
  const hasValue = !!(startValue || endValue);

  return (
    <div className="filter-group">
      <label htmlFor={`${id}-start`} className={labelClassName}>{label}</label>
      <div className="filter-date-range">
        <input
          id={`${id}-start`}
          type="date"
          className="filter-date-input"
          value={startValue || ""}
          max={getManilaDateString()}
          onChange={onStartChange}
          disabled={disabled}
          aria-label={`${label} start`}
        />
        <span className="filter-date-sep">to</span>
        <input
          id={`${id}-end`}
          type="date"
          className="filter-date-input"
          value={endValue || ""}
          min={getManilaDateString()}
          onChange={onEndChange}
          disabled={disabled}
          aria-label={`${label} end`}
        />
        {hasValue && (
          <button
            type="button"
            className="filter-date-clear"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear date range"
            title="Clear date range"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
