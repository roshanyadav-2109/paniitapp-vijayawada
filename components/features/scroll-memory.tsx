"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORE = "scroll-memory";
/** How long to keep trying while a page's content is still arriving. */
const PATIENCE_MS = 2000;

function readAll(): Record<string, number> {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORE) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function here(): string {
  return window.location.pathname + window.location.search;
}

/** Shared with the handlers: where to go back to, and whether we are going. */
interface Memo {
  __scrollTarget?: number | null;
  __scrollRestoring?: boolean;
}
const memo = () => window as unknown as Memo;

/**
 * Back puts you where you were on the page, not at its top.
 *
 * The browser's own restoring happens the moment Back is pressed, before the
 * screen it goes back to has its content: on a short half-loaded page the
 * place it wants is not there yet, and it lands at the top. This remembers
 * how far down each screen was, and on Back (or a reload for a new release)
 * goes back there as the content arrives, giving up if you start scrolling
 * yourself.
 */
export function ScrollMemory() {
  const pathname = usePathname();

  // Remember the position as it changes, a frame at a time.
  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // While going back to a place, the jumps on the way are not a place.
        if (memo().__scrollRestoring) return;
        const all = readAll();
        all[here()] = Math.round(window.scrollY);
        try {
          window.sessionStorage.setItem(STORE, JSON.stringify(all));
        } catch {
          // storage blocked: Back simply lands where the browser puts it
        }
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, []);

  // Note when a change of screen came from Back or Forward, or a reload.
  useEffect(() => {
    // Read the place now, the moment Back is pressed: the jump to the top
    // that follows would otherwise be saved over it.
    const mark = () => {
      memo().__scrollTarget = readAll()[here()] ?? null;
      memo().__scrollRestoring = true;
      // However it ends, saving resumes once the going back is over.
      window.setTimeout(() => {
        memo().__scrollRestoring = false;
      }, PATIENCE_MS + 400);
    };
    window.addEventListener("popstate", mark);
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav && (nav.type === "reload" || nav.type === "back_forward")) mark();
    return () => window.removeEventListener("popstate", mark);
  }, []);

  // On arriving that way, go back to where this screen was left.
  useEffect(() => {
    const m = memo();
    if (!m.__scrollRestoring) return;
    const target = m.__scrollTarget;
    const done = () => {
      m.__scrollRestoring = false;
      m.__scrollTarget = null;
    };
    if (!target) {
      done();
      return;
    }

    let stop = false;
    const giveUp = () => {
      stop = true;
      done();
    };
    window.addEventListener("wheel", giveUp, { passive: true, once: true });
    window.addEventListener("touchstart", giveUp, { passive: true, once: true });
    window.addEventListener("keydown", giveUp, { once: true });

    const started = performance.now();
    let frame = 0;
    const tryNow = () => {
      if (stop) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room >= target - 2) {
        window.scrollTo(0, target);
        done();
        return;
      }
      if (performance.now() - started > PATIENCE_MS) {
        window.scrollTo(0, Math.max(0, room));
        done();
        return;
      }
      frame = requestAnimationFrame(tryNow);
    };
    frame = requestAnimationFrame(tryNow);
    return () => {
      // Only stop trying: if this screen is set up again at once (as
      // development does on purpose), the next attempt picks up from here.
      stop = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", giveUp);
      window.removeEventListener("touchstart", giveUp);
      window.removeEventListener("keydown", giveUp);
    };
  }, [pathname]);

  return null;
}
