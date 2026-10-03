"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fresh screens without closing the app.
 *
 * An installed app is rarely closed: it goes to the background and comes
 * back, and the screen it comes back to is the one it left, however old.
 * Changes made meanwhile (a session moved, a post, an answer) only showed
 * once the app was swiped away and opened again.
 *
 * Mounted once in the shell: coming back after more than a little while
 * re-reads the current screen.
 */
export function RefreshOnReturn({
  awayMs = 20_000,
  onReturn = true,
}: {
  awayMs?: number;
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

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, awayMs, onReturn]);

  return null;
}
