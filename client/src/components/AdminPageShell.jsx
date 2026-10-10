import AdminSidebar from "./AdminSidebar";

/**
 * `overlay` (not `children`) is where modals go — they must stay siblings
 * of <main>, not descendants, because some pages' main class sets `transform`, which
 * would break position:fixed for anything nested inside it.
 */
export default function AdminPageShell({ outerClassName, mainClassName, children, overlay }) {
  return (
    <div className={outerClassName}>
      <AdminSidebar />
      <main className={mainClassName}>{children}</main>
      {overlay}
    </div>
  );
}
