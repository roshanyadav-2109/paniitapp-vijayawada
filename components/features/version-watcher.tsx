"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const BUILT = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/**
 * Picks up a new release without the app being closed.
 *
 * Checks which build is live when the app comes back to the front and every
 * five minutes while it is open. Once a newer one is out it reloads at the
 * next quiet moment: the next time the app is brought back, or the next
 * change of screen. Never in the middle of what someone is typing.
 */
export function VersionWatcher() {
  const pathname = usePathname();
  const stale = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    if (BUILT === "dev") return;
    let cancelled = false;
    async function check() {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { v } = (await r.json()) as { v?: string };
        if (!cancelled && v && v !== "dev" && v !== BUILT) stale.current = true;
      } catch {
        // offline: try again later
      }
    }
    const onVisibility = () => {
      if (document.hidden) return;
      if (stale.current) window.location.reload();
      else void check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(() => {
      if (!document.hidden) void check();
    }, 5 * 60_000);
    void check();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, []);

  // A change of screen is a natural moment to take the new version.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (stale.current) window.location.reload();
  }, [pathname]);

  return null;
}
