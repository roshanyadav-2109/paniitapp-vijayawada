import Image from "next/image";
import Link from "next/link";
import { EVENT_SECTORS } from "@/lib/event-config";

/**
 * The eight focussed sectors.
 *
 * A plain grid, still. It drifted for a while and does not any more: eight
 * tiles fit on one screen three across, so the movement was carrying
 * nothing — it only meant a sector you wanted to read walked away while you
 * read it.
 *
 * Three across on a phone lands them in three rows with the last cell
 * empty; four across from tablet up, which is two rows.
 */
export function SectorMarquee() {
  if (EVENT_SECTORS.length === 0) return null;

  return (
    <ul
      className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4"
      aria-label="Focussed sectors"
    >
      {EVENT_SECTORS.map((sector) => (
        <li key={sector.slug}>
          <Link
            href="/agenda"
            className="block text-center focus:outline-none focus-visible:underline"
          >
            {/* The glyph is the smaller half of the tile — at full width it
                read as a button rather than a mark over its label. */}
            <span className="relative mx-auto block aspect-square w-[46px] sm:w-[54px]">
              <Image
                src={sector.image}
                alt={sector.label}
                fill
                sizes="54px"
                className="object-contain"
              />
            </span>
            {/* No break-words: it split "Semiconduc/tors" and
                "Entrepreneur/ship" mid-syllable with no hyphen. The cell is
                wide enough and the type small enough that the longest word
                in the set fits its own line. */}
            <span className="mt-1.5 block px-0.5 font-display text-[10.5px] font-semibold leading-snug text-brand-950 sm:text-[11.5px]">
              {sector.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
