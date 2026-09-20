"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "@/components/icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAppPrompt } from "@/hooks/use-app-prompt";
import { cn } from "@/lib/utils";
import { EVENT_INSTALL_ART, EVENT_NOTIFY_ART } from "@/lib/event-config";
import {
  APP_PROMPT_EVENT,
  snooze,
  type AppPromptKind,
} from "@/lib/pwa";

/** Days a "Not now" holds for, per prompt. */
const SNOOZE_DAYS: Record<AppPromptKind, number> = {
  install: 7,
  notifications: 14,
};

/** Long enough that it slides up over a page, not into a blank one. */
const AUTO_OPEN_DELAY = 3200;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buf;
}

/**
 * The slide-up that offers to install the app, and — once it is installed —
 * to turn notifications on.
 *
 * It comes up by itself a few seconds in, at most one prompt per visit, and
 * a "Not now" holds for a week. The banner on the home screen opens the same
 * sheet on demand through the `paniit:app-prompt` window event, so there is
 * one piece of copy and one piece of logic rather than two.
 */
export function AppPromptSheet({
  vapidPublicKey,
}: {
  vapidPublicKey: string | null;
}) {
  const { toast } = useToast();
  const status = useAppPrompt();
  const [kind, setKind] = useState<AppPromptKind | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useRef(false);

  // Opened from the home banner.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const k = (e as CustomEvent<AppPromptKind>).detail;
      shown.current = true;
      setKind(k);
    };
    window.addEventListener(APP_PROMPT_EVENT, onOpen);
    return () => window.removeEventListener(APP_PROMPT_EVENT, onOpen);
  }, []);

  // Local review only: the notifications step never comes up in a tab now
  // that it waits for an installed app, so ?prompt=notifications opens
  // either one on demand. Dead in a production build.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const want = new URLSearchParams(window.location.search).get("prompt");
    if (want === "install" || want === "notifications") {
      shown.current = true;
      setKind(want);
    }
  }, []);

  // Opened by itself, once, when there is something to ask.
  const due = status.due;
  useEffect(() => {
    if (!due || shown.current) return;
    const t = setTimeout(() => {
      shown.current = true;
      setKind(due);
    }, AUTO_OPEN_DELAY);
    return () => clearTimeout(t);
  }, [due]);

  const close = useCallback(
    (dismissed: boolean) => {
      if (dismissed && kind) snooze(kind, SNOOZE_DAYS[kind]);
      setKind(null);
    },
    [kind]
  );

  async function install() {
    const evt = status.deferred;
    if (!evt) return;
    setBusy(true);
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") setKind(null);
      else close(true);
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    setBusy(true);
    try {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      status.setPermission(perm);
      if (perm !== "granted") {
        close(true);
        toast({ title: "Notifications blocked", variant: "destructive" });
        return;
      }

      // Permission is the part the visitor sees. The push subscription only
      // happens where the keys are configured — without them the browser is
      // still allowed to show a notification, so this is not a failure.
      if (vapidPublicKey && "serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
      }
      setKind(null);
      toast({ title: "Notifications on" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not turn them on";
      toast({ title: "Push failed", description: msg, variant: "destructive" });
      setKind(null);
    } finally {
      setBusy(false);
    }
  }

  if (!kind) return null;

  const isInstall = kind === "install";
  const art = isInstall ? EVENT_INSTALL_ART : EVENT_NOTIFY_ART;
  const title = isInstall
    ? "Install the summit app"
    : "Turn on notifications";
  // iOS never fires the install event: Safari installs through the Share
  // sheet only, so there the prompt has to say how rather than offer a button.
  const iosOnly = isInstall && !status.deferred && status.ios;

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) close(true);
      }}
    >
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-t-0 p-0 pb-[max(env(safe-area-inset-bottom),1rem)]",
          // Same ground as this prompt's banner on the home screen.
          isInstall ? "bg-[#DCEFE4]" : "bg-[#D8E6FA]"
        )}
      >
        <div className="mx-auto w-full max-w-md px-5 pb-1 pt-4">
          <div
            aria-hidden
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-brand-950/20"
          />

          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-[19px] font-semibold leading-snug text-brand-950">
                {title}
              </SheetTitle>

              {iosOnly ? (
                <ol className="mt-3 space-y-1.5 text-[13px] text-brand-950">
                  <li>1. Tap Share in Safari</li>
                  <li>2. Tap Add to Home Screen</li>
                </ol>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                {iosOnly ? (
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="inline-flex h-9 items-center rounded-md bg-emerald-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-emerald-900"
                  >
                    Got it
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isInstall ? install : enableNotifications}
                    disabled={busy || (isInstall && !status.deferred)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium text-white transition-colors disabled:opacity-60",
                      // Matches the banner this prompt belongs to.
                      isInstall
                        ? "bg-emerald-800 hover:bg-emerald-900"
                        : "bg-brand-800 hover:bg-brand-900"
                    )}
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isInstall ? (
                      <Download className="size-3.5" strokeWidth={1.8} />
                    ) : null}
                    {isInstall ? "Install" : "Allow"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="inline-flex h-9 items-center rounded-md px-3 text-[13px] font-medium text-brand-950/70 transition-colors hover:bg-white/60"
                >
                  Not now
                </button>
              </div>
            </div>

            {art ? (
              <Image
                src={art}
                alt=""
                width={420}
                height={420}
                sizes="200px"
                // Portrait phone, landscape bell — matched by the space they
                // take rather than by height.
                className={
                  isInstall
                    ? "h-[116px] w-auto shrink-0 sm:h-[128px]"
                    : "h-[92px] w-auto shrink-0 sm:h-[104px]"
                }
              />
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
