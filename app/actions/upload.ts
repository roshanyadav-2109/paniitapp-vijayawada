"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Signature for one direct-to-Cloudinary upload.
 *
 * The file never passes through this server — the browser posts it straight
 * to Cloudinary — but the permission to upload does. Cloudinary's signature
 * is a SHA-1 of the upload parameters plus the API secret, so the secret
 * stays here and the browser gets a token that is good for one set of
 * parameters and expires with its timestamp.
 *
 * The alternative, an unsigned preset, would let anyone who reads the page
 * source upload to this account for as long as the preset exists. This way
 * the only people who can get a signature are the ones already signed in to
 * the summit app.
 */

/** Everything lands here, so the console can quota and prune one folder. */
const FOLDER = "paniit-ap-2026/discussion";

export type SignedUpload =
  | {
      cloudName: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    }
  | { error: string };

export async function signCloudinaryUpload(): Promise<SignedUpload> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { error: "Uploads are not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to attach a file." };

  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signs the parameters it will receive, sorted by key, joined
  // as a query string, with the secret appended. Any parameter sent with the
  // upload and not signed here is rejected, so this list and the browser's
  // form have to agree exactly.
  const toSign = `folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return { cloudName, apiKey, timestamp, folder: FOLDER, signature };
}
