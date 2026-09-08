"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, UserRound } from "@/components/icons";
import { initials } from "@/lib/utils";

interface Person {
  id: string;
  full_name: string;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
}

const ROTATE_MS = 4200; // total time per card (slide-in + hold + slide-out)

export function KeyParticipantsStrip({ people }: { people: Person[] }) {
  const list = useMemo(() => people, [people]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIdx((c) => (c + 1) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [list.length, paused]);

  function next() {
    setIdx((c) => (c + 1) % Math.max(list.length, 1));
  }
  function prev() {
    setIdx((c) => (c - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1));
  }

  if (list.length === 0) {
    return (
      <div className="mx-4 rounded-lg bg-white p-5 text-center text-sm text-brand-900/75 ring-1 ring-brand-100 sm:mx-6 lg:mx-8">
        Featured participants will appear here closer to the event.
      </div>
    );
  }

  const cur = list[idx];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        setPaused(false);
        if (start !== null && end !== null) {
          const d = end - start;
          if (d > 40) prev();
          else if (d < -40) next();
        }
      }}
    >
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous participant"
          className="mr-2 hidden size-9 shrink-0 place-items-center rounded-full border border-brand-100 bg-white text-brand-800 transition-colors hover:bg-brand-50 md:inline-grid"
        >
          <ChevronLeft className="size-4" strokeWidth={1.8} />
        </button>
        <div className="relative w-full max-w-[280px]">
          <ParticipantCard
            key={`${cur.id}-${idx}`}
            person={cur}
            animate={list.length > 1}
            paused={paused}
          />
        </div>
        <button
          type="button"
          onClick={next}
          aria-label="Next participant"
          className="ml-2 hidden size-9 shrink-0 place-items-center rounded-full border border-brand-100 bg-white text-brand-800 transition-colors hover:bg-brand-50 md:inline-grid"
        >
          <ChevronRight className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {list.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show participant ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-5 bg-brand-800" : "w-1.5 bg-brand-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({
  person,
  animate,
  paused,
}: {
  person: Person;
  /** The slide keyframes end at opacity 0 with fill-mode forwards, so
   *  they must only run when another card is coming to replace this one.
   *  With a single participant the interval never fires and the card would
   *  animate itself off screen and stay gone. */
  animate: boolean;
  paused: boolean;
}) {
  return (
    <article
      className="relative isolate aspect-[3/4] w-full overflow-hidden rounded-lg bg-white ring-1 ring-brand-100 will-change-transform"
      style={
        animate
          ? {
              animation: `participant-bounce ${ROTATE_MS}ms cubic-bezier(0.45, 0.05, 0.2, 1.05) forwards`,
              // Hover/touch pauses rotation; without this the animation keeps
              // running and dumps the card at opacity 0 mid-hover.
              animationPlayState: paused ? "paused" : "running",
            }
          : undefined
      }
    >
      {/* The photo runs on behind the arc rather than stopping at its apex.
          The arc is an ellipse: its top is at 75% in the centre but dips to
          about 79% at the card edges, so cutting the photo at 75% left white
          wedges either side of it. 82% covers those and tucks the surplus
          behind the arc. At 82% of a 3/4 card the photo box is ~0.94:1, so a
          square source loses only a few percent off the sides — nothing like
          the third it was being scaled up by when it filled the whole card. */}
      <div className="absolute inset-x-0 top-0 h-[82%] w-full overflow-hidden bg-brand-50/40">
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.full_name}
            fill
            className="object-cover object-top"
            sizes="(min-width: 768px) 280px, 70vw"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl font-semibold text-brand-800">
            {initials(person.full_name)}
          </div>
        )}
      </div>

      {/* The blue arc, unchanged apart from dropping -z-10 so it now sits over
          the photo instead of behind the old white card face. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[75%] h-[60%] w-[200%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle,#3b329e_0%,#1B1464_70%,#0d0930_100%)]"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-5 text-center">
        <p className="text-[15px] font-semibold leading-tight text-white drop-shadow-sm">
          {person.full_name}
        </p>
        {person.designation || person.company ? (
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">
            {[person.designation, person.company].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <span className="inline-flex items-center justify-center gap-1 text-[11px] text-white/70">
            <UserRound className="size-3" strokeWidth={1.7} /> Participant
          </span>
        )}
      </div>
    </article>
  );
}
