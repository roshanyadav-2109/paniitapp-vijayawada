import Image from "next/image";
import type { EventMediaItem } from "@/lib/event-config";

/**
 * Swipeable gallery of photographs — dignitaries, press coverage, past
 * summits.
 *
 * Renders nothing when handed an empty list, the same way the IIT marquee
 * does: an empty frame or a row of broken images is worse than the section
 * simply not being there, and it lets pictures be added a few at a time.
 *
 * Cards are 78% of the viewport rather than full width, so the next one is
 * always half in frame. That peek is what tells you it swipes — a full-width
 * card with dots under it looks like a static image until you happen to try.
 */
export function MediaCarousel({ items }: { items: EventMediaItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul
      className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth scroll-pl-3 px-3 pb-1 sm:-mx-5 sm:scroll-pl-5 sm:px-5 lg:-mx-6 lg:scroll-pl-6 lg:px-6"
      aria-label="Media gallery"
    >
      {items.map((item) => (
        <li
          key={item.src}
          className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
        >
          <figure>
            {/* 4:5 rather than 4:3. These are photographs of people, and a
                landscape frame crops a near-square group shot through the
                heads. Portrait suits both a standing group and a press
                clipping. */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-paper-deep">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 31vw"
                className="object-cover"
              />
            </div>
            {item.caption ? (
              <figcaption className="mt-2 text-[12.5px] leading-snug text-brand-900/65">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
