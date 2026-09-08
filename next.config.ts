import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
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
    ];
  },
};

export default nextConfig;
