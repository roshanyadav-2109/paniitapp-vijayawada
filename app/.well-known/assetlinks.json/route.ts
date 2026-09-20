import { NextResponse } from "next/server";

/**
 * Digital Asset Links: the site's half of the handshake with the Android app.
 *
 * A Trusted Web Activity only runs without an address bar if the site names
 * the app that is allowed to present it, by package and by the SHA-256 of
 * the key it was signed with. Without this file the app still opens, but
 * with a browser bar across the top — which is exactly the thing the native
 * shell exists to remove.
 *
 * Served from a route rather than public/.well-known so the fingerprint can
 * come from the environment: Play re-signs uploaded bundles with its own
 * key, and that key's fingerprint has to be added here before the Store
 * build will verify.
 */
export const dynamic = "force-static";

const DEV_FINGERPRINT =
  "0A:1C:1D:B8:2D:01:2A:75:7B:74:84:75:2C:18:78:30:BE:02:CE:D0:E6:96:60:27:21:DF:96:71:6C:2C:E0:56";

export function GET() {
  const fingerprints = [
    process.env.ANDROID_CERT_FINGERPRINT || DEV_FINGERPRINT,
    // Play App Signing re-signs the bundle, so the Store's own fingerprint
    // has to be listed too once the app is uploaded.
    process.env.ANDROID_PLAY_CERT_FINGERPRINT,
  ].filter(Boolean) as string[];

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name:
            process.env.ANDROID_PACKAGE_NAME || "org.paniit.ap2026.twa",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
