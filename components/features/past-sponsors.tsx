import Image from "next/image";
import { EVENT_PAST_SPONSORS } from "@/lib/event-config";

/**
 * Sponsors of previous PanIIT summits.
 *
 * A quiet grid, not a marquee. There is already one marquee on this page
 * carrying the 23 IITs, and a second moving row underneath turns the foot of
 * the home screen into a slideshow. A grid also lets someone look for a
 * particular name instead of waiting for it to come round.
 *
 * No cells, borders or panels — several of these logos ship with their own
 * white panel baked in, and a frame around those draws a box inside a box.
 * The logos sit on the page ground at a common height and are left in their
 * own colours: a greyscale wash would read as "former" in a way nobody
 * asked for.
 */
export function PastSponsors() {
  if (EVENT_PAST_SPONSORS.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 items-center gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
      {EVENT_PAST_SPONSORS.map((sponsor) => (
        <li key={sponsor.slug} className="relative h-14 sm:h-16">
          <Image
            src={sponsor.logo}
            alt={sponsor.name}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 15vw"
            className="object-contain"
          />
        </li>
      ))}
    </ul>
  );
}
