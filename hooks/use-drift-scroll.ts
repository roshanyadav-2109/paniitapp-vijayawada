"use client";

import { useEffect, useRef } from "react";

/**
 * A row that drifts on its own and can still be swiped.
 *
 * The strips used to be CSS marquees: a track translated by half its width,
 * which looks right but cannot be touched — a transform is not scroll, so a
 * finger on it did nothing and the only way to see the far end was to wait.
 * This scrolls a real overflow container instead, so the browser's own
 * touch, trackpad and wheel handling all work, and the drift is script.
 *
 * The list must be rendered twice. The wrap is a straight assignment at the
 * halfway mark, where the second copy sits exactly where the first began, so
 * nothing visibly jumps. Scrolling backwards past zero wraps the same way,
 * which a marquee could never do.
 *
 * Touching it stops the drift; it picks up again a few seconds after the
 * last interaction. prefers-reduced-motion means it never drifts at all —
 * the row is still there and still swipeable.
 */
export function useDriftScroll<T extends HTMLElement>(
  pxPerSecond = 26,
  idleMs = 2500
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let last = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let held = false; // finger or button down
    let hovered = false;
    let waking = false; // a scroll this code caused, not the visitor
    // A row further down the page used to have drifted half its length
    // before it was ever looked at, so the first thing seen was the middle
    // of it. It starts when it comes into view, and stops when it leaves.
    let onscreen = false;

    const half = () => el.scrollWidth / 2;

    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (el.scrollLeft >= h) {
        waking = true;
        el.scrollLeft -= h;
      } else if (el.scrollLeft <= 0) {
        waking = true;
        el.scrollLeft += h;
      }
    };

    const idle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
      }, idleMs);
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      if (reduced.matches || !onscreen || held || hovered || idleTimer) return;
      waking = true;
      el.scrollLeft += pxPerSecond * dt;
      wrap();
    };

    const onScroll = () => {
      // A scroll we did not cause is the visitor's; hold off until they stop.
      if (waking) {
        waking = false;
      } else {
        idle();
      }
      wrap();
    };

    const down = () => {
      held = true;
      idle();
    };
    const up = () => {
      held = false;
      idle();
    };
    const enter = () => {
      hovered = true;
    };
    const leave = () => {
      hovered = false;
    };

    // 10% of the row visible is enough to count as "you are looking at it",
    // and the drift stops again the moment it leaves — a row scrolled past
    // should not keep moving off-screen for the rest of the visit.
    const seen = new IntersectionObserver(
      ([entry]) => {
        onscreen = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    seen.observe(el);

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", down, { passive: true });
    el.addEventListener("pointerup", up, { passive: true });
    el.addEventListener("pointercancel", up, { passive: true });
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchend", up, { passive: true });
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    // A link that walks away mid-read is worse than a still row.
    el.addEventListener("focusin", enter);
    el.addEventListener("focusout", leave);

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
      if (idleTimer) clearTimeout(idleTimer);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchend", up);
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("focusin", enter);
      el.removeEventListener("focusout", leave);
    };
  }, [pxPerSecond, idleMs]);

  return ref;
}
