import Image from "next/image";
import { EVENT_IITS } from "@/lib/event-config";

/**
 * The 23 IITs, drifting past under the About section.
 *
 * Renders nothing until logo files exist in public/iits/. That is deliberate:
 * a row of broken-image icons is worse than no row, and it means the strip can
 * be filled in one campus at a time as artwork arrives rather than waiting for
 * all 23.
 *
 * The track is duplicated and translated -50%, which is the same trick
 * partners-groups.tsx uses — at the halfway point the second copy sits exactly
 * where the first started, so the loop has no seam.
 */
export function IitMarquee() {
  if (EVENT_IITS.length === 0) return null;

  const stream = [...EVENT_IITS, ...EVENT_IITS];

  return (
    <div
      className="-mx-3 mt-5 overflow-hidden sm:-mx-5 lg:-mx-6"
      aria-label={`Logos of the ${EVENT_IITS.length} IITs`}
    >
      <div className="flex w-max animate-marquee-rtl items-center gap-7 px-3 sm:px-5 lg:px-6">
        {stream.map((iit, i) => (
          <span
            key={`${iit.slug}-${i}`}
            className="relative h-11 w-[72px] shrink-0"
            // The duplicate half is decorative; a screen reader should hear
            // each campus once, not twice.
            aria-hidden={i >= EVENT_IITS.length}
          >
            <Image
              src={iit.logo}
              alt={i < EVENT_IITS.length ? iit.name : ""}
              fill
              sizes="72px"
              className="object-contain"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
