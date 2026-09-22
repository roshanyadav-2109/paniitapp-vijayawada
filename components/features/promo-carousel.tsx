"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  EVENT_PROMOS,
  EVENT_PROMO_SLOTS,
  type EventPromo,
} from "@/lib/event-config";

/** How long each banner holds before the strip moves on. */
const HOLD_MS = 5000;

/**
 * Banner strip above the agenda, advancing on its own.
 *
 * It moves by scrolling to the next card rather than by translating a
 * track: the cards snap, so a scroll lands exactly on a card boundary and
 * the reader can still swipe it themselves at any point without fighting an
 * animation. At the end it returns to the first card.
 *
 * It waits while the pointer is over it or a finger is on it — a banner
 * that slides away mid-read is worse than one that never moves — and
 * respects prefers-reduced-motion by not moving at all.
 *
 * Until there is artwork it draws numbered slots at the size the artwork
 * should be, which is the useful state to ship: the space is visibly
 * reserved and whoever makes the banners knows what to make.
 */
export function PromoCarousel() {
  const promos: EventPromo[] = EVENT_PROMOS;
  const count = promos.length > 0 ? promos.length : EVENT_PROMO_SLOTS;
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const first = el.children[0] as HTMLElement | undefined;
      if (!first) return;
      // Card width plus the gap: measuring the second card's offset is more
      // reliable than adding a hard-coded gap to the first card's width.
      const second = el.children[1] as HTMLElement | undefined;
      const step = second
        ? second.offsetLeft - first.offsetLeft
        : first.offsetWidth;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, HOLD_MS);

    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <ul
      ref={trackRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto scroll-smooth scroll-pl-3 px-3 pb-1 sm:-mx-5 sm:scroll-pl-5 sm:px-5 lg:-mx-6 lg:scroll-pl-6 lg:px-6"
      aria-label="Summit banners"
    >
      {Array.from({ length: count }).map((_, i) => {
        const promo = promos[i];

        const frame = (
          <span
            className={`relative block w-full overflow-hidden rounded-lg ${
              // Alone it is a banner across the page and can keep its own
              // shape; in a row they have to agree on one, or the row is a
              // ragged edge.
              count === 1 ? "aspect-[2/1]" : "aspect-[16/9]"
            }`}
          >
            {promo ? (
              <Image
                src={promo.src}
                alt={promo.alt}
                fill
                sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 31vw"
                className="object-cover"
              />
            ) : (
              // Dashed rule and a size, not a grey block with an icon in the
              // middle: this has to read as "a banner goes here", not as a
              // picture that failed to load.
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-rule-strong bg-paper-deep/60 text-center">
                <span className="text-[12.5px] font-medium text-brand-950">
                  Banner {i + 1}
                </span>
                <span className="text-[11px] tabular-nums text-brand-900/55">
                  1200 × 675
                </span>
              </span>
            )}
          </span>
        );

        return (
          <li
            key={promo?.src ?? `slot-${i}`}
            // A peek at the next card is what says "these scroll". With one
            // banner there is no next card, so the peek is just a gap.
            className={
              count === 1
                ? "w-full shrink-0 snap-start"
                : "w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
            }
          >
            {promo?.href ? (
              <Link href={promo.href} className="block">
                {frame}
              </Link>
            ) : (
              frame
            )}
          </li>
        );
      })}
    </ul>
  );
}
