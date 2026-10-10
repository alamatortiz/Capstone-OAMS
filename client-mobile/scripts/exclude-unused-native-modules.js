// Runs on EAS after `npm install` (package.json "eas-build-post-install").
// expo-camera's native code (ML Kit barcode models + libbarhopper_v3.so, ~5 MB)
// is autolinked into every build, but only the admin variant scans QR codes
// (admin_scan_document.tsx). Expo's autolinking exclusion list is read from
// package.json only, so for the student/faculty builds we add it here, on the
// EAS build machine's copy -- the committed package.json is never modified.
const fs = require('fs');
const path = require('path');

const variant = process.env.APP_VARIANT;
// Unset (local/dev/combined app) and admin keep the camera.
if (!variant || variant === 'admin') {
  console.log(`[exclude-unused-native-modules] variant "${variant ?? 'none'}" keeps expo-camera.`);
  process.exit(0);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.expo = pkg.expo || {};
pkg.expo.autolinking = pkg.expo.autolinking || {};
const exclude = new Set(pkg.expo.autolinking.exclude || []);
exclude.add('expo-camera');
pkg.expo.autolinking.exclude = [...exclude];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`[exclude-unused-native-modules] excluded expo-camera from the ${variant} build.`);
