"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function extFor(file: File): string {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/avif") return "avif";
  return "jpg";
}

export function ProfilePhotoUpload({
  userId,
  initialPhotoUrl,
  fallbackName,
}: {
  userId: string;
  initialPhotoUrl: string | null;
  fallbackName: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Use a JPG, PNG, WebP or AVIF image.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: "Profile photos must be 3 MB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const path = `${userId}/avatar.${extFor(file)}`;
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });
      if (uploadErr) throw uploadErr;

      // Public URL — append a cachebuster so the new image renders
      // immediately even when the same path is reused on re-upload.
      const { data: pub } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      const next = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ photo_url: next })
        .eq("id", userId);
      if (profileErr) throw profileErr;

      setPhotoUrl(next);
      toast({ title: "Profile photo updated" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast({ title: "Could not upload", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!photoUrl) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Remove your profile photo?")
    )
      return;
    setBusy(true);
    try {
      // Best-effort delete of every variant we know we might have written.
      const stems = ["avatar.jpg", "avatar.png", "avatar.webp", "avatar.avif"];
      await supabase.storage
        .from("profile-photos")
        .remove(stems.map((s) => `${userId}/${s}`));
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ photo_url: null })
        .eq("id", userId);
      if (profileErr) throw profileErr;
      setPhotoUrl(null);
      toast({ title: "Profile photo removed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove failed.";
      toast({ title: "Could not remove", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-20 ring-2 ring-brand-50">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback className="bg-brand-50 text-base font-semibold text-brand-800">
            {initials(fallbackName ?? "?")}
          </AvatarFallback>
        </Avatar>
        {busy ? (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-800 px-4 text-[13px] font-semibold tracking-tight text-white shadow-[0_6px_18px_-8px_rgba(13,9,48,0.45)] transition-all hover:bg-brand-900 hover:shadow-[0_10px_24px_-10px_rgba(13,9,48,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="size-4" strokeWidth={1.7} />
            {photoUrl ? "Change photo" : "Upload photo"}
          </button>
          {photoUrl ? (
            <button
              type="button"
              onClick={removePhoto}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-brand-100 bg-white px-3 text-[12px] font-semibold text-brand-900 transition-colors hover:bg-brand-50 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" strokeWidth={1.7} />
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-[11px] leading-4 text-brand-800/70">
          JPG, PNG, WebP or AVIF · up to 3&nbsp;MB
        </p>
      </div>
    </div>
  );
}
