/**
 * `labelClassName` defaults to "filter-label", but one consuming page renders a bare
 * unstyled <label> (no class at all) — pass `labelClassName={undefined}` there to match.
 * `chevronIcon` is a prop (not hardcoded) because pages source their chevron from different
 * places (lucide-react's ChevronDown vs. a local hand-rolled ChevronDownIcon).
 */
export default function FilterSelect({
  id,
  label,
  labelClassName = "filter-label",
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel,
  chevronIcon,
}) {
  return (
    <div className="filter-group">
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <div className="filter-select-wrapper">
        <select
          id={id}
          className="filter-select"
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {chevronIcon}
      </div>
    </div>
  );
}
