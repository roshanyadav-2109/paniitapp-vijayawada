import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    // Speaker portraits and sponsor logos essentially never change, so let
    // the shared optimiser cache hold them for a month instead of the
    // 60s default. Without this every rotation of the guest carousel can
    // re-hit the optimiser, which is what made cards flash white.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "fncnndrexzmqqengbkvi.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Wikimedia Commons — freely licensed portraits for public figures on
      // the guest list. See supabase/seed_ap_key_participant_photos.sql for
      // the per-image licence and attribution.
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
      { protocol: "https", hostname: "www.deccanchronicle.com" },
      { protocol: "https", hostname: "wsai.iitm.ac.in" },
      { protocol: "https", hostname: "cee.iittp.ac.in" },
      { protocol: "https", hostname: "media.assettype.com" },
      { protocol: "https", hostname: "images.stocklens.co.in" },
    ],
  },
  async headers() {
    // A year, and immutable: these files are replaced by writing a new name,
    // never by editing one in place, so a shared cache never has to ask
    // whether its copy is still good.
    const forever = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    ];

    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },

      // Artwork and logos, all of it shipped in the repo and versioned by
      // filename. /_next/static already carries its own immutable header;
      // everything under public/ did not.
      { source: "/empty/:path*", headers: forever },
      // /ui holds the profile row icons too (public/ui/me). They used to sit
      // at /me, which is also a signed-in route — one rule would have been
      // caching the other's pages publicly.
      { source: "/ui/:path*", headers: forever },
      { source: "/x/:path*", headers: forever },
      { source: "/legacy/:path*", headers: forever },
      { source: "/past-sponsors/:path*", headers: forever },
      { source: "/logo/:path*", headers: forever },
      { source: "/iits/:path*", headers: forever },
      { source: "/sectors/:path*", headers: forever },
      { source: "/audience/:path*", headers: forever },
      { source: "/icons/:path*", headers: forever },
      { source: "/press/:path*", headers: forever },
      { source: "/carousel/:path*", headers: forever },

      // Everything below is somebody's own screen. Shared caches must not
      // hold any of it: one delegate's badge, inbox or meeting list handed
      // to the next visitor would be worse than a slow page.
      ...[
        "/me/:path*",
        "/chat/:path*",
        "/meetings/:path*",
        "/recap/:path*",
        "/scan/:path*",
        "/admin/:path*",
        "/onboarding/:path*",
        "/api/:path*",
      ].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      })),
    ];
  },
};

export default nextConfig;
