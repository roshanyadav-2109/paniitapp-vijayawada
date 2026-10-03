"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { contentVersion } from "@/components/features/offline-support";

/**
 * Fresh screens without closing the app.
 *
 * An installed app is rarely closed: it goes to the background and comes
 * back, and the screen it comes back to is the one it left, however old.
 * Changes made meanwhile (a session moved, a post, an answer) only showed
 * once the app was swiped away and opened again.
 *
 * Mounted once in the shell: coming back after more than a little while
 * re-reads the current screen. With `everyMs` (the agenda), the screen is
 * also re-read on that interval while it is on screen, each phone at its own
 * moment so they do not all ask at once.
 */
export function RefreshOnReturn({
  awayMs = 20_000,
  everyMs,
  onReturn = true,
}: {
  awayMs?: number;
  everyMs?: number;
  /** Off for a screen's own interval copy: the shell's copy already
   *  refreshes on return, and two would re-read the screen twice. */
  onReturn?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt = document.hidden ? Date.now() : 0;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (onReturn && hiddenAt && Date.now() - hiddenAt > awayMs) router.refresh();
      hiddenAt = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    // On an interval, ask only whether anything changed (a fingerprint the
    // CDN answers), and re-read the screen only when it has: an unchanged
    // programme costs no server render.
    let timer: ReturnType<typeof setTimeout> | null = null;
    let seen: string | null = null;
    if (everyMs) {
      void contentVersion().then((v) => (seen = v));
      const tick = async () => {
        if (!document.hidden) {
          const v = await contentVersion();
          if (v && seen && v !== seen) router.refresh();
          if (v) seen = v;
        }
        timer = setTimeout(tick, everyMs + Math.random() * 15_000);
      };
      timer = setTimeout(tick, everyMs + Math.random() * 15_000);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) clearTimeout(timer);
    };
  }, [router, awayMs, everyMs, onReturn]);

  return null;
}
