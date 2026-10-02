import { signCloudinaryUpload } from "@/app/actions/upload";

/**
 * Direct-to-Cloudinary uploads, signed by our own server.
 *
 * The browser asks the server for a signature, then posts the file itself to
 * Cloudinary — the bytes never touch this app, which keeps a large clip off
 * the server's request path, and the API secret never leaves it either.
 *
 * Only the cloud name is public. Without it there is no attach button at
 * all, rather than a button that fails when pressed.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const IMAGE_ACCEPT = "image/*";
export const VIDEO_ACCEPT = "video/*";
/** Cloudinary's own limits on this account's plan (checked 29/09/26). A
 *  photo is made smaller than this on the phone before it is sent, so in
 *  practice only a video can come near its limit. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type MediaKind = "image" | "video";
export interface UploadedMedia {
  url: string;
  type: MediaKind;
}

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD);
}

/**
 * A phone's photo, made fit to send: at most 2048 px on its long side, as a
 * JPEG. A camera's 4000 px original is 5 to 12 MB, over the photo limit at
 * the top end and a long wait on the venue's Wi-Fi at any size; this is a
 * few hundred KB and looks the same in the feed. Anything the browser cannot
 * decode (an animated GIF, a format it does not read) goes as it is.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/**
 * Sends a photo or a video to Cloudinary, reporting how far along it is:
 * a 60 MB clip over the venue's Wi-Fi takes long enough that a spinner
 * alone reads as stuck.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<UploadedMedia> {
  const isVideo = file.type.startsWith("video/");
  const body = isVideo ? file : await shrinkPhoto(file);
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (body.size > limit) {
    throw new Error(
      `That ${isVideo ? "video" : "photo"} is ${(body.size / 1024 / 1024).toFixed(0)} MB. The limit is ${
        limit / 1024 / 1024
      } MB.`
    );
  }

  const signed = await signCloudinaryUpload();
  if ("error" in signed) throw new Error(signed.error);

  const form = new FormData();
  form.append("file", body);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("folder", signed.folder);
  form.append("signature", signed.signature);

  // `auto` lets Cloudinary decide image or video from the bytes rather than
  // trusting the browser's MIME type, and it reports which it chose — that
  // is what the post row stores and what decides <img> versus <video>.
  const data = await new Promise<{ secure_url?: string; resource_type?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let parsed: { secure_url?: string; resource_type?: string; error?: { message?: string } } = {};
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        // not JSON: the status line is all there is
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
      else reject(new Error(parsed.error?.message ?? `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check the connection and try again."));
    xhr.send(form);
  });

  if (!data.secure_url) throw new Error("Upload returned no URL.");
  return {
    url: data.secure_url,
    type: data.resource_type === "video" ? "video" : "image",
  };
}

/**
 * The address to show a stored photo or video at, sized for a phone.
 *
 * Cloudinary delivers what the URL asks for: f_auto picks the lightest
 * format the browser reads (AVIF or WebP), q_auto the lowest quality that
 * still looks the same, and a width of 1080 is as wide as any phone shows
 * it. The stored file is untouched.
 */
export function deliverUrl(url: string, kind: MediaKind): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i < 0) return url;
  const t = kind === "video" ? "q_auto,w_1080,c_limit" : "f_auto,q_auto,w_1080,c_limit";
  return `${url.slice(0, i + marker.length)}${t}/${url.slice(i + marker.length)}`;
}
