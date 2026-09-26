// Each role signs in at its own URL. The bare /login just forwards to the
// student portal, so anything that needs to send someone back to sign in
// (logout, expired session, protected page while signed out) targets their
// own role's page instead.
const LOGIN_PATHS = {
  student: "/login/student",
  faculty: "/login/faculty",
  admin: "/login/admin",
  superadmin: "/login/superadmin",
};

export function loginPathForRole(role) {
  return LOGIN_PATHS[role] ?? LOGIN_PATHS.student;
}
