/**
 * `breadcrumb` is passed as an already-built node (not a `to`/`onClick` prop pair) because
 * the 10 pages this was consolidated from compute their breadcrumb target differently —
 * a plain Link, a Link/button ternary, a 3-way ternary, or an onBack-prop-driven button.
 * Each page keeps its own logic and just hands the resolved element to this component.
 */
export default function PageHeader({
  breadcrumb,
  icon,
  iconClassName = "page-title-icon",
  title,
  subtitle,
  headerClassName = "page-header",
  breadcrumbClassName = "page-breadcrumb",
  titleSectionClassName = "page-title-section",
  titleClassName = "page-title",
  subtitleClassName = "page-subtitle",
}) {
  return (
    <div className={headerClassName}>
      <div className={breadcrumbClassName}>{breadcrumb}</div>
      <div className={titleSectionClassName}>
        <div className={iconClassName}>{icon}</div>
        <div>
          <h1 className={titleClassName}>{title}</h1>
          <p className={subtitleClassName}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
