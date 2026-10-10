// Which split app this build is (see eas.json's preview-student/-faculty/-admin
// profiles and metro.config.js). Unset in the original combined build (local
// dev, and any eas.json profile that doesn't set it) -- every role is allowed
// there, same as before the split. In a split build the other roles' route
// files genuinely aren't bundled, so routing a wrong-role user to their
// dashboard would land on a missing route instead of failing cleanly.
export const APP_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT as
  | 'student'
  | 'faculty'
  | 'admin'
  | undefined;

const VARIANT_ALLOWED_ROUTE_ROLES: Record<string, readonly string[]> = {
  student: ['student'],
  faculty: ['professor'],
  admin: ['admin', 'superadmin'],
};

export const VARIANT_LABELS: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Admin',
};

// Takes a *route* role (getRouteRole(): "professor", not the server's "faculty").
export function isRouteRoleAllowedInThisApp(routeRole: string): boolean {
  const allowed = APP_VARIANT ? VARIANT_ALLOWED_ROUTE_ROLES[APP_VARIANT] : null;
  return !allowed || allowed.includes(routeRole);
}

export const DASHBOARD_PATH_BY_ROUTE_ROLE = {
  student: '/pages/student/student_dashboard',
  professor: '/pages/professor/professor_dashboard',
  admin: '/pages/admin/admin_dashboard',
  superadmin: '/pages/superadmin/superadmin_dashboard',
} as const;
