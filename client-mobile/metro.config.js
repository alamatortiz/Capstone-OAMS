const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// APP_VARIANT splits this one codebase into 3 separate, smaller binaries --
// student / faculty / admin (admin build also carries superadmin, since it
// already reuses most of the admin screens). Unset (local dev, and the
// original eas.json profiles that don't set it) still produces the full
// combined app under the original package name -- nothing changes for
// anyone not opting into a split build.
//
// Blocking the other roles' route folders here (Metro's own file map, not
// just a runtime guard) means their code is genuinely absent from that
// variant's JS bundle -- not reachable even from a decompiled APK, and it's
// what actually shrinks the build instead of just hiding a nav item. See
// app.config.js for the matching android.package/name switch per variant,
// and app/(tabs)/login.tsx for the wrong-role-in-wrong-app guard this
// requires (a real login for another role would otherwise try to navigate
// to a route this bundle no longer has).
const VARIANT_ALLOWED_ROLE_DIRS = {
  student: ["student"],
  faculty: ["professor"],
  admin: ["admin", "superadmin"],
};
const ALL_ROLE_DIRS = ["admin", "professor", "student", "superadmin"];

const allowedDirs = VARIANT_ALLOWED_ROLE_DIRS[process.env.APP_VARIANT];

if (allowedDirs) {
  const blockedDirs = ALL_ROLE_DIRS.filter((dir) => !allowedDirs.includes(dir));
  // Matches app/(tabs)/pages/<blocked-role>/... on both / and \ path separators.
  const blockedPagesPattern = new RegExp(
    `[\\\\/]app[\\\\/]\\(tabs\\)[\\\\/]pages[\\\\/](${blockedDirs.join("|")})[\\\\/]`,
  );
  config.resolver.blockList = [...config.resolver.blockList, blockedPagesPattern];
}

module.exports = config;
