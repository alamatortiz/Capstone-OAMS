// Was app.json -- converted to app.config.js so the Android package name and
// display name can switch per APP_VARIANT (see metro.config.js for the
// matching route-bundling split). Unset APP_VARIANT (local dev, and any
// eas.json profile that doesn't set it) falls through to the original
// combined app under the original "com.pnc.oams" package -- nothing changes
// for anyone not opting into a split build.
const VARIANT_LABELS = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
};

const variantLabel = VARIANT_LABELS[process.env.APP_VARIANT];
// Android/iOS both key installed-app identity off this string -- two
// variants sharing one package name would silently overwrite each other on
// the same test device instead of installing side by side.
// Only the admin build scans QR codes (admin_scan_document.tsx); the combined
// dev app (APP_VARIANT unset) keeps it too. Student/faculty drop the camera
// plugin, its CAMERA/RECORD_AUDIO permissions, and (via
// scripts/exclude-unused-native-modules.js) the native ML Kit barcode code.
const needsCamera = !process.env.APP_VARIANT || process.env.APP_VARIANT === "admin";

const appId = variantLabel ? `com.pnc.oams.${process.env.APP_VARIANT}` : "com.pnc.oams";

module.exports = {
  expo: {
    name: variantLabel ? `OAMS ${variantLabel}` : "OAMS",
    slug: "client-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "clientmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: appId,
    },
    android: {
      package: appId,
      // google-services.json now has a client entry for all 4 packages
      // (com.pnc.oams + .student/.faculty/.admin), registered as separate
      // apps under the same "oams-capstone" Firebase project -- one file
      // covers every variant, Google's Gradle plugin just picks the entry
      // matching whichever `package` is configured above.
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: needsCamera ? ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"] : [],
      // A leftover library manifest still merged these in after the plugin was
      // dropped, so strip them explicitly from the builds that never use them.
      ...(needsCamera ? {} : { blockedPermissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"] }),
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      ...(needsCamera
        ? [
            [
              "expo-camera",
              {
                cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan document QR codes.",
              },
            ],
          ]
        : []),
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 320,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#7e14ff",
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "48def5ce-8755-4257-91ff-2187f8940f79",
      },
    },
  },
};
