"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_HERO_SLIDES } from "@/lib/event-config";

type Slide = (typeof EVENT_HERO_SLIDES)[number];

const SLIDES: Slide[] = EVENT_HERO_SLIDES;

const N = SLIDES.length;
const INTERVAL_MS = 4500;
const SCROLL_MS = 600;
/** Quiet time after the last scroll event before the strip moves itself. */
const IDLE_MS = 2000;

/**
 * Move the scroller without animating it.
 *
 * `scrollTo({ behavior: "auto" })` does not mean "jump" — it means "do
 * whatever CSS says", and this scroller is `scroll-smooth`. So the
 * wrap-around from the phantom clone back to the real first slide animated,
 * dragging the strip visibly backwards through every slide instead of
 * reading as one continuous forward cycle. Suppressing the CSS for the
 * duration of the assignment is the part that actually makes it instant;
 * `behavior: "instant"` alone is younger than some of the browsers this runs
 * on.
 */
function jumpTo(el: HTMLElement, left: number) {
  const prev = el.style.scrollBehavior;
  el.style.scrollBehavior = "auto";
  el.scrollLeft = left;
  el.style.scrollBehavior = prev;
}

export function HeroCarousel() {
  // Indexes 0..N-1 = real slides; N = phantom clone of slide 0 used to make
  // the wrap-around appear as continuous forward motion. After we animate to
  // the phantom, the layout effect silently resets scroll to real slide 0.
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);
  // Set when the reader's own scrolling is what changed `active`. The effect
  // below then updates the dots and leaves the scroller alone — scrolling it
  // back to where the finger already is, which is what it used to do, is the
  // fight that made the strip judder.
  const fromUserRef = useRef(false);
  // True while a finger is down or the strip is still coasting.
  const busyRef = useRef(false);
  const idleTimer = useRef<number | null>(null);

  function markBusy() {
    busyRef.current = true;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      busyRef.current = false;
      idleTimer.current = null;
      // Left sitting on the phantom clone by hand, put the strip back on the
      // real first slide without animating, or the next advance would run
      // the whole way backwards.
      const el = scrollerRef.current;
      if (!el) return;
      setActive((cur) => {
        if (cur !== N) return cur;
        const realFirst = el.children[0] as HTMLElement | undefined;
        if (realFirst) jumpTo(el, realFirst.offsetLeft);
        fromUserRef.current = true;
        return 0;
      });
    }, IDLE_MS);
  }

  // Auto-advance forward forever — except while it is being handled. A timer
  // that fires mid-swipe yanks the strip out from under the finger.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (busyRef.current) return;
      setActive((cur) => (cur + 1) % (N + 1));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Smooth-scroll to the active slide, then snap from phantom → real 0.
  useEffect(() => {
    // The reader put us here; the browser's own snap has already landed it.
    if (fromUserRef.current) {
      fromUserRef.current = false;
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[active] as HTMLElement | undefined;
    if (!child) return;
    lockRef.current = true;
    el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    const t = window.setTimeout(() => {
      if (active === N) {
        const realFirst = el.children[0] as HTMLElement | undefined;
        if (realFirst) jumpTo(el, realFirst.offsetLeft);
        // Reset state to 0. The pass that follows scrolls to a slide we are
        // already on, so nothing moves, and it releases the lock — which has
        // to stay held through the jump or the scroll events it emits would
        // be read as the reader swiping.
        setActive(0);
        return;
      }
      lockRef.current = false;
    }, SCROLL_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  function onScroll() {
    if (lockRef.current) return;
    markBusy();
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const e = c as HTMLElement;
      const mid = e.offsetLeft + e.offsetWidth / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    setActive((cur) => {
      if (cur === bestIdx) return cur;
      fromUserRef.current = true;
      return bestIdx;
    });
  }

  // Render N + 1 slides — last one is a visual clone of slide 0.
  const rendered: Slide[] = [...SLIDES, SLIDES[0]];
  const dotActive = active >= N ? 0 : active;

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={markBusy}
        onTouchStart={markBusy}
        // items-center, not the default stretch: slides now differ in height,
        // and a short one left top-aligned hangs in a gap instead of sitting
        // in its own space.
        className="no-scrollbar flex snap-x snap-mandatory items-center gap-3 overflow-x-auto scroll-smooth"
      >
        {rendered.map((s, i) => (
          <article
            key={i}
            // No border and no ground of its own — the card around the
            // whole masthead supplies both. The small radius stays, because
            // the picture is inset from that card's edges rather than flush
            // to them, and a square corner inside a rounded one at 8px of
            // separation reads as a mistake.
            className="relative snap-center shrink-0 basis-full overflow-hidden rounded-md"
          >
            {/* No fixed aspect. These slides are posters, banners and
                photographs at whatever shape they were made — 4:3, 16:9, a
                2.17:1 strip — and a 16:9 frame with object-cover cropped each
                of them differently, taking the top off a poster to fit. The
                frame follows the artwork instead. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="block h-auto w-full"
            />
            {/* Caption for slides that label a person. Scrim only where the
                text sits, so the banner artwork is untouched. */}
            {s.name ? (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="text-[15px] font-semibold leading-tight text-white drop-shadow sm:text-[17px]">
                    {s.name}
                  </p>
                  {s.role ? (
                    <p className="mt-0.5 text-[11px] font-medium text-white/85 sm:text-[12px]">
                      {s.role}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>
      {/* Padding rather than a margin: the dots are inside the card, and
          this row is what separates the picture from the text under it. */}
      <div className="flex items-center justify-center gap-1.5 py-2.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === dotActive ? "w-6 bg-brand-800" : "w-1.5 bg-brand-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
