import Image from "next/image";
import Link from "next/link";
import { EVENT_SECTORS } from "@/lib/event-config";

/**
 * The summit's eight session themes, from the 11/09/26 brochure.
 *
 * Design note — the duotone is load-bearing, not decoration. The source
 * artwork is eight photographs with nothing in common: a violet circuit
 * board, a gold quantum chandelier, a green wheat field, a blue clean room.
 * Dropped into a grid at full saturation they read as clip art scraped from
 * eight different decks. Rendering them greyscale under a navy `mix-blend-
 * color` layer collapses all eight to one ink, so the grid reads as a single
 * designed object; colour returns on hover/focus, which makes the restraint
 * feel deliberate rather than like a loading state.
 *
 * The blurb is desktop-hover only. On a 2-up mobile grid a third line of
 * 12px text under each tile turns the section into a wall — the full list
 * with blurbs lives on the About screen instead.
 */
export function SectorGrid() {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {EVENT_SECTORS.map((sector, i) => (
        <li key={sector.slug} className="min-w-0">
          <Link
            href="/agenda"
            className="group block focus:outline-none"
            aria-label={`${sector.label} — ${sector.slot}. ${sector.blurb}`}
          >
            <div className="relative aspect-square overflow-hidden rounded-sm ring-1 ring-brand-950/10 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-brand-800">
              <Image
                src={sector.image}
                alt=""
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                className="object-cover grayscale brightness-[0.82] contrast-[1.2] transition duration-500 group-hover:scale-[1.03] group-hover:brightness-100 group-hover:grayscale-0 group-hover:contrast-100 group-focus-visible:grayscale-0"
              />
              {/* Navy ink layer — hue and saturation from this, luminosity
                  from the greyscale photo underneath. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-brand-800 opacity-85 mix-blend-color transition-opacity duration-500 group-hover:opacity-0 group-focus-visible:opacity-0"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-brand-950/35 transition-opacity duration-500 group-hover:opacity-0"
              />

              <span
                aria-hidden
                className="absolute left-2 top-1.5 font-display text-[11px] font-semibold tabular-nums text-paper/75"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/95 via-brand-950/55 to-transparent px-2.5 pb-2 pt-9">
                <span className="block font-display text-[13px] font-semibold leading-tight text-paper">
                  {sector.label}
                </span>
              </span>

              {/* Desktop hover: the one line of substance about the sector. */}
              <span className="absolute inset-0 hidden items-end bg-brand-900/92 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
                <span className="text-[12px] leading-5 text-paper/90">
                  {sector.blurb}
                </span>
              </span>
            </div>
            <p className="eyebrow mt-1.5 text-brand-900/55">{sector.slot}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
