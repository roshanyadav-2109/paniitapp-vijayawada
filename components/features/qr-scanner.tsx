"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PREFIX = "paniit2026:";

// Two-note "ding" via Web Audio so we don't need to ship an asset.
function playSuccessChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + start);
      o.stop(now + start + dur);
    };
    playTone(880, 0, 0.18, 0.2);
    playTone(1320, 0.12, 0.28, 0.18);
    // Close the context after the chime is fully scheduled to free resources
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {
    /* ignore audio failures (locked-by-policy, etc.) */
  }
}

interface ScannerInstance {
  stop: () => Promise<void>;
  clear: () => void;
}

export function QrScanner() {
  const router = useRouter();
  const { toast } = useToast();
  const elId = "qr-scanner-region";
  const [status, setStatus] = useState<"starting" | "running" | "error">(
    "starting"
  );
  const [pending, setPending] = useState(false);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const handlingRef = useRef(false);

  // Always cleanly stop the camera when the component unmounts. Without this,
  // navigating away (Home tab, etc.) while the scanner is live throws a
  // "client-side exception" because html5-qrcode tries to drive detached DOM.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        // verbose=false silences the library's own info chrome.
        const scanner = new Html5Qrcode(elId, /* verbose */ false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // Omit qrbox so the library doesn't paint its own framing
            // rectangle on top of the outer card. The outer rounded
            // container is our only viewfinder; the scanner decodes the
            // full camera frame.
            aspectRatio: 1,
          },
          (decoded) => {
            void handleDecoded(decoded);
          },
          () => {
            /* ignore per-frame decode errors */
          }
        );
        if (!cancelled) setStatus("running");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Could not start camera";
        toast({
          title: "Camera error",
          description: msg,
          variant: "destructive",
        });
        setStatus("error");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      // Stop is async — swallow errors so React's unmount can complete cleanly.
      Promise.resolve()
        .then(() => s.stop())
        .catch(() => {})
        .finally(() => {
          try {
            s.clear();
          } catch {
            /* node already gone */
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecoded(text: string) {
    if (handlingRef.current) return;
    handlingRef.current = true;
    setPending(true);
    const token = text.startsWith(PREFIX) ? text.slice(PREFIX.length) : text;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in first", variant: "destructive" });
        return;
      }
      const { data: target } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("qr_token", token)
        .maybeSingle();
      if (!target) {
        toast({
          title: "Code didn't match an attendee",
          variant: "destructive",
        });
        return;
      }
      if (target.id === user.id) {
        toast({ title: "That's your own badge" });
        return;
      }
      const a = user.id < target.id ? user.id : target.id;
      const b = user.id < target.id ? target.id : user.id;
      await supabase
        .from("connections")
        .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" });
      playSuccessChime();
      toast({ title: `Connected with ${target.full_name ?? "attendee"}` });
      // Stop the camera before navigating so the unmount cleanup has nothing to fight.
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          await s.stop();
        } catch {
          /* already stopped */
        }
        try {
          s.clear();
        } catch {
          /* node gone */
        }
      }
      router.push(`/attendees/${target.id}`);
    } finally {
      setPending(false);
      handlingRef.current = false;
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-brand-100 bg-black shadow-sm">
        <div
          id={elId}
          className="absolute inset-0 [&_img]:hidden [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative size-[72%] max-h-[280px] max-w-[280px] rounded-lg">
            <span className="absolute left-0 top-0 size-10 rounded-tl-lg border-l-4 border-t-4 border-white" />
            <span className="absolute right-0 top-0 size-10 rounded-tr-lg border-r-4 border-t-4 border-white" />
            <span className="absolute bottom-0 left-0 size-10 rounded-bl-lg border-b-4 border-l-4 border-white" />
            <span className="absolute bottom-0 right-0 size-10 rounded-br-lg border-b-4 border-r-4 border-white" />
          </div>
        </div>
      </div>
      {status === "starting" ? (
        <div className="flex items-center justify-center gap-2 text-sm text-brand-800/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting camera…
        </div>
      ) : pending ? (
        <div className="flex items-center justify-center gap-2 text-sm text-brand-800/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving connection…
        </div>
      ) : status === "running" ? (
        <p className="text-center text-xs text-brand-800/75">
          Point the camera at another attendee&apos;s QR badge to swap contacts.
        </p>
      ) : (
        <p className="text-center text-xs text-iit-500">
          Camera blocked — check browser permissions and try again.
        </p>
      )}
    </div>
  );
}
