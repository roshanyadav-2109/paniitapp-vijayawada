import { signCloudinaryUpload } from "@/app/actions/upload";

/**
 * Direct-to-Cloudinary uploads, signed by our own server.
 *
 * The browser asks the server for a signature, then posts the file itself to
 * Cloudinary — the bytes never touch this app, which keeps a 10MB clip off
 * the server's request path, and the API secret never leaves it either.
 *
 * Only the cloud name is public. Without it there is no attach button at
 * all, rather than a button that fails when pressed.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const MEDIA_ACCEPT = "image/*,video/*";
/** Cloudinary's free tier caps a single unpaid upload at 10MB of video. */
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export type MediaKind = "image" | "video";
export interface UploadedMedia {
  url: string;
  type: MediaKind;
}

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD);
}

export async function uploadToCloudinary(file: File): Promise<UploadedMedia> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${
        MAX_MEDIA_BYTES / 1024 / 1024
      }MB.`
    );
  }

  const signed = await signCloudinaryUpload();
  if ("error" in signed) throw new Error(signed.error);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("folder", signed.folder);
  form.append("signature", signed.signature);

  // `auto` lets Cloudinary decide image or video from the bytes rather than
  // trusting the browser's MIME type, and it reports which it chose — that
  // is what the post row stores and what decides <img> versus <video>.
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    // Cloudinary puts the reason in error.message; the status alone says
    // nothing useful about a rejected format or an expired signature.
    let reason = `Upload failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error?.message) reason = body.error.message;
    } catch {
      // Not JSON — the status line is all there is.
    }
    throw new Error(reason);
  }

  const data = (await res.json()) as {
    secure_url?: string;
    resource_type?: string;
  };
  if (!data.secure_url) throw new Error("Upload returned no URL.");

  return {
    url: data.secure_url,
    type: data.resource_type === "video" ? "video" : "image",
  };
}
