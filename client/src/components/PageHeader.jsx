/**
 * `breadcrumb` is passed as an already-built node (not a `to`/`onClick` prop pair) because
 * the 10 pages this was consolidated from compute their breadcrumb target differently —
 * a plain Link, a Link/button ternary, a 3-way ternary, or an onBack-prop-driven button.
 * Each page keeps its own logic and just hands the resolved element to this component.
 */
export default function PageHeader({ breadcrumb, icon, iconClassName = "queue-title-icon", title, subtitle }) {
  return (
    <div className="queue-header">
      <div className="queue-breadcrumb">{breadcrumb}</div>
      <div className="queue-title-section">
        <div className={iconClassName}>{icon}</div>
        <div>
          <h1 className="queue-title">{title}</h1>
          <p className="queue-subtitle">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
