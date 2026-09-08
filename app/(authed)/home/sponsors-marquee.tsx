"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface SponsorTier {
  /** Folder name (e.g. "Title Sponsor") used as the visible row label. */
  name: string;
  /** Public URLs of the tier's logo files. Order = slide order. */
  logos: string[];
}

// One white card. Each tier renders as a single-slot viewport that
// shows one logo at a time. When the timer ticks, the track slides
// right-to-left by one slot — the visible logo glides off the left
// edge while the next logo glides in from the right, then holds.
// Loops seamlessly via a duplicated leading slide (snap-back is
// invisible because the next real slide is already in the same place).
export function SponsorsBoard({ tiers }: { tiers: SponsorTier[] }) {
  const visible = tiers.filter((t) => t.logos.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="rounded-lg border border-brand-100 bg-white p-5">
      <h2 className="text-base font-semibold tracking-tight text-brand-950">
        Sponsors
      </h2>
      <div className="mt-4 flex flex-col gap-5">
        {visible.map((tier) => (
          <TierRow key={tier.name} tier={tier} />
        ))}
      </div>
    </section>
  );
}

function TierRow({ tier }: { tier: SponsorTier }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className="block h-4 w-[3px] rounded-full bg-brand-800"
          aria-hidden
        />
        <h3 className="text-[12px] font-semibold tracking-tight text-brand-900">
          {tier.name}
        </h3>
      </div>
      <SponsorSlider logos={tier.logos} />
    </div>
  );
}

const HOLD_MS = 1800;
const SLIDE_MS = 600;

function SponsorSlider({ logos }: { logos: string[] }) {
  // Append a clone of the first slide at the end so the wrap from last
  // → first happens off-screen without a visible jump.
  const stream = logos.length > 1 ? [...logos, logos[0]] : logos;
  const [idx, setIdx] = useState(0);
  const [animate, setAnimate] = useState(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (logos.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setAnimate(true);
      setIdx((c) => c + 1);
    }, HOLD_MS + SLIDE_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [logos.length]);

  useEffect(() => {
    // When we land on the clone (last index), snap silently back to 0.
    if (idx !== stream.length - 1 || logos.length <= 1) return;
    const t = window.setTimeout(() => {
      setAnimate(false);
      setIdx(0);
      // Re-enable animation on the next frame so the next tick slides
      // again rather than snapping.
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [idx, stream.length, logos.length]);

  if (logos.length === 0) return null;

  return (
    <div className="relative h-16 w-full overflow-hidden sm:h-20">
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${idx * 100}%)`,
          transition: animate
            ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
        }}
      >
        {stream.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="flex h-full w-full shrink-0 items-center justify-center px-6 sm:px-10"
          >
            {/* The inner wrapper has a fixed height (the entire slot
                minus padding) AND object-contain on the image, so
                logos that are smaller than the slot scale UP to fit
                and logos that are larger scale DOWN. Aspect ratio is
                preserved either way — nothing crops, nothing dwarfs. */}
            <div className="relative h-full w-full max-w-[200px]">
              <Image
                src={url}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 160px, 200px"
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
