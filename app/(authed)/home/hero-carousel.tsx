"use client";

import { useEffect, useRef, useState } from "react";

interface Slide {
  src: string;
  alt: string;
}

const SLIDES: Slide[] = [
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_359/pan_image_1_1_50.png",
    alt: "PAN IIT 2026 — promotional banner 1",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_359/pan_image_2_50.png",
    alt: "PAN IIT 2026 — promotional banner 2",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_2567/PANIITGuestpanel1.png",
    alt: "PAN IIT 2026 — guest panel 1",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_2567/PANIITpanel2.png",
    alt: "PAN IIT 2026 — guest panel 2",
  },
];

const N = SLIDES.length;
const INTERVAL_MS = 4500;
const SCROLL_MS = 600;

export function HeroCarousel() {
  // Indexes 0..N-1 = real slides; N = phantom clone of slide 0 used to make
  // the wrap-around appear as continuous forward motion. After we animate to
  // the phantom, the layout effect silently resets scroll to real slide 0.
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);

  // Auto-advance forward forever.
  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((cur) => (cur + 1) % (N + 1));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Smooth-scroll to the active slide, then snap from phantom → real 0.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[active] as HTMLElement | undefined;
    if (!child) return;
    lockRef.current = true;
    el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    const t = window.setTimeout(() => {
      if (active === N) {
        const realFirst = el.children[0] as HTMLElement | undefined;
        if (realFirst) {
          el.scrollTo({ left: realFirst.offsetLeft, behavior: "auto" });
        }
        // Reset state to 0 without re-triggering the smooth-scroll branch.
        setActive(0);
      }
      lockRef.current = false;
    }, SCROLL_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  function onScroll() {
    if (lockRef.current) return;
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
    setActive(bestIdx);
  }

  // Render N + 1 slides — last one is a visual clone of slide 0.
  const rendered: Slide[] = [...SLIDES, SLIDES[0]];
  const dotActive = active >= N ? 0 : active;

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
      >
        {rendered.map((s, i) => (
          <article
            key={i}
            className="relative snap-center shrink-0 basis-full overflow-hidden rounded-lg border border-brand-100 bg-white lg:aspect-video"
          >
            {/* Mobile keeps the image at its natural aspect so framing matches
                the source. Desktop forces 16:9 with object-cover so the
                carousel doesn't stretch tall on wide viewports. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="block h-auto w-full lg:h-full lg:object-cover"
            />
          </article>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
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
