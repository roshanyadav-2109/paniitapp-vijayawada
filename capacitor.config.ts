/**
 * The iOS shell.
 *
 * Android is a Trusted Web Activity (see android/README.md) because that
 * runs in Chrome and so keeps Google sign-in working. Apple has no
 * equivalent, so iOS needs this: a real app whose view is the deployed site.
 *
 * `server.url` rather than a bundled copy, so the app follows deployments
 * instead of needing a release for every change. The cost is that it needs a
 * connection to start — acceptable for an event app that is a directory and
 * a programme, both of which are live data anyway.
 *
 * Generating the Xcode project (`npx cap add ios`) and building it require
 * macOS. Nothing here is used by the web app or the Android build.
 *
 * Untyped on purpose: @capacitor/cli is not a dependency of the web app and
 * installing it only to type this file would put a native toolchain in every
 * Vercel build. `npm i -D @capacitor/cli @capacitor/core @capacitor/ios` on
 * the Mac that builds it, and the type comes back.
 */
const config = {
  appId: "org.paniit.ap2026",
  appName: "PanIIT AP 2026",
  webDir: "public",
  server: {
    url: "https://paniitapp-vijayawada-ashen.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#EFF3FA",
    // Links out of scope — LinkedIn, X, Maps — open in the system browser
    // rather than replacing the app's own view with a page it cannot leave.
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#1B1464",
      showSpinner: false,
    },
  },
};

export default config;
