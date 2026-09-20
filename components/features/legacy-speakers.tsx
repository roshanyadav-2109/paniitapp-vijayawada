import Image from "next/image";
import type { CSSProperties } from "react";
import { EVENT_LEGACY_SPEAKERS } from "@/lib/event-config";

/**
 * Who past PanIIT summits have had on stage, drifting past.
 *
 * A moving row rather than a grid: ten portraits stacked in a grid on a
 * phone is five rows of faces, which reads as this summit's line-up however
 * it is labelled. A row that never stops moving reads as a back catalogue,
 * which is what it is.
 *
 * The track carries the list twice and translates by half its own width, so
 * at the loop point the second copy sits exactly where the first began and
 * there is no seam. That only holds if every repeat is identical, which is
 * why the page inset lives on the middle div and the spacing is a margin on
 * each portrait: padding on the animated track itself would make half the
 * width land short of one full copy, and the row would jump by that
 * difference every time round.
 *
 * It pauses under the pointer and for keyboard focus, and
 * prefers-reduced-motion stops it altogether — nothing here needs the
 * movement to be legible.
 */
export function LegacySpeakers() {
  if (EVENT_LEGACY_SPEAKERS.length === 0) return null;

  const stream = [...EVENT_LEGACY_SPEAKERS, ...EVENT_LEGACY_SPEAKERS];
  const half = EVENT_LEGACY_SPEAKERS.length;

  return (
    <div
      className="marquee-hoverable -mx-3 overflow-hidden sm:-mx-5 lg:-mx-6"
      aria-label="Speakers at previous PanIIT summits"
    >
      <div className="pl-3 sm:pl-5 lg:pl-6">
        <ul
          className="flex w-max animate-marquee-rtl"
          style={{ "--marquee-duration": "48s" } as CSSProperties}
        >
          {stream.map((person, i) => (
            <li
              key={`${person.slug}-${i}`}
              className="mr-5 w-[104px] shrink-0 text-center sm:mr-6 sm:w-[120px]"
              // The second copy is scenery; a screen reader should hear each
              // name once.
              aria-hidden={i >= half}
            >
              <Image
                src={person.image}
                alt={i < half ? person.name : ""}
                width={360}
                height={360}
                sizes="120px"
                className="mx-auto size-[88px] rounded-full object-cover sm:size-[104px]"
              />
              <p className="mt-2.5 font-display text-[12.5px] font-semibold leading-snug text-brand-950">
                {person.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-brand-900/55">
                {person.role}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
