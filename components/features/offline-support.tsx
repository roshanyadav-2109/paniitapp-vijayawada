"use client";

import { useEffect, useState } from "react";

/**
 * The hall has next to no signal, so the app has to work from what the
 * phone already holds. public/sw.js keeps every page it is sent; these two
 * pieces make sure it has been sent the ones that matter, and tell the
 * person when what they are looking at is a kept copy.
 */

// The screens someone needs inside the hall. The worker follows every
// session, stall and speaker link on them as well.
const WARM_PATHS = [
  "/home",
  "/agenda",
  "/speakers",
  "/exhibitors",
  "/map",
  "/attendees",
  "/discuss",
  "/me",
  "/me/qr",
];
// Saved against this fingerprint of the programme, stalls, speakers and
// build (app/api/content-version). Saved again only when it changes.
const WARMED_VERSION_KEY = "offline-warmed-version";

/** The current content fingerprint, or null with no signal. */
export async function contentVersion(): Promise<string | null> {
  try {
    const r = await fetch("/api/content-version", { cache: "no-store" });
    if (!r.ok) return null;
    return ((await r.json()) as { v?: string }).v ?? null;
  } catch {
    return null;
  }
}
const SCOPE_KEY = "offline-scope";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: warm every visit instead */
  }
}

export function OfflineWarmup({ scope }: { scope: string | null }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    const run = async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active;
      if (!sw || cancelled || !navigator.onLine) return;

      // Pages hold the signed-in person's own details, so a different
      // person on this phone starts from nothing.
      const who = scope ?? "guest";
      if (read(SCOPE_KEY) !== who) {
        sw.postMessage({ type: "forget-pages" });
        write(SCOPE_KEY, who);
        write(WARMED_VERSION_KEY, "");
      }

      // Nothing new on the server since the last save: keep what we have.
      const v = await contentVersion();
      if (!v || cancelled || read(WARMED_VERSION_KEY) === v) return;
      write(WARMED_VERSION_KEY, v);
      sw.postMessage({ type: "warm", paths: WARM_PATHS });

      // The 3D map's code loads only when the map opens; fetch it now so
      // the worker keeps it.
      import("@/app/(authed)/map/venue-canvas").catch(() => undefined);
    };

    // After the screen has settled, so warming never competes with it.
    const t = window.setTimeout(run, 4000);
    window.addEventListener("online", run);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("online", run);
    };
  }, [scope]);

  return null;
}

function savedAtLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="x-offline-copy"]');
    if (meta) setSavedAt(meta.content || "");
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online && savedAt === null) return null;

  const when = savedAt ? savedAtLabel(savedAt) : "";
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-brand-900 px-4 py-2 text-[12.5px] leading-snug text-white"
    >
      <span>
        <span className="font-semibold">Offline.</span>{" "}
        {savedAt !== null
          ? `Showing the copy saved${when ? ` ${when}` : ""}.`
          : "Saved screens still open."}{" "}
        <span className="text-white/70">Chat, posts and votes need signal.</span>
      </span>
      {online && savedAt !== null ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-brand-950"
        >
          Refresh
        </button>
      ) : null}
    </div>
  );
}
