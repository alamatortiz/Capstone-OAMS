import StudentSidebar from "./StudentSidebar";

/**
 * `overlay` (not `children`) is where modals like ActionConfirmModal go — they must
 * stay siblings of <main>, not descendants, because some pages' main class sets
 * `transform` (e.g. `.doc-main`), which would break position:fixed for anything nested inside it.
 */
export default function StudentPageShell({ outerClassName, mainClassName, children, overlay }) {
  return (
    <div className={outerClassName}>
      <StudentSidebar />
      <main className={mainClassName}>{children}</main>
      {overlay}
    </div>
  );
}
