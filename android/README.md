# Native shells

## Android — built, signed, ready to install

`paniit-ap-2026.apk` (sideload / testing) and `paniit-ap-2026.aab` (Play
Console upload) are produced from this directory.

It is a Trusted Web Activity: a real Android app whose window is Chrome
without any browser interface, pointed at the deployed site. That matters for
sign-in — a TWA runs in Chrome, so Google authenticates normally, where a
plain WebView wrapper would be refused with `disallowed_useragent`.

### Rebuilding

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "C:\Android"
cd android
bubblewrap update --skipVersionUpgrade   # regenerate from twa-manifest.json
.\gradlew.bat assembleRelease bundleRelease --no-daemon
```

Then sign with `apksigner` (APK) and `jarsigner` (AAB) using
`paniit-release.keystore`. Bump `appVersionCode` in `twa-manifest.json` for
every Play upload.

### The two things that must stay in step

1. **The keystore is the app's identity.** `paniit-release.keystore` and
   `keystore-password.txt` are gitignored and exist only on this machine.
   Lose them and this listing can never be updated again — back them up
   somewhere that is not a laptop.
2. **The fingerprint must match `/.well-known/assetlinks.json`.** It does
   today (`0A:1C:...:56`). Without a match the app still opens, but with an
   address bar across the top, which is the entire thing it exists to avoid.

When you upload to Play, **Play re-signs the bundle with its own key**. Take
that key's SHA-256 from Play Console → Setup → App signing, and set it as
`ANDROID_PLAY_CERT_FINGERPRINT` in Vercel. The route already reads it and
publishes both.

## iOS — scaffolded, needs a Mac

Apple has no equivalent of a TWA, so iOS needs Capacitor: a real app whose
view is the site. `capacitor.config.ts` at the repo root is written and
points at production.

What cannot be done from here, and why:

- `npx cap add ios` generates an Xcode project and runs CocoaPods, which is
  macOS-only.
- Building, signing and uploading need Xcode and a paid Apple Developer
  account.

Two things to settle before that work is worth starting:

1. **Sign-in will not work as it stands.** Google refuses OAuth inside a
   WKWebView, so the iOS build needs a native Google sign-in plugin handing
   its ID token to `/api/auth/google/id-token`, which already accepts one.
2. **App Review guideline 4.2.** A wrapper around a website gets rejected
   unless it does things a website cannot. This app has a case to make —
   push notifications, the QR badge and scanner, an offline programme — and
   it should make it in the review notes rather than leave it to be guessed.

Until then, iOS users get the PWA: Share → Add to Home Screen gives a
standalone window, the launch screens and the icon, with no browser
interface. It is the same app; it just is not on the App Store.
