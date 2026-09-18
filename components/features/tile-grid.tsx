import Image from "next/image";
import Link from "next/link";

export interface GridTile {
  slug: string;
  label: string;
  image: string;
  /** Small line under the tile — a time, a room, a panel number. */
  caption?: string;
  /** One line revealed on hover, desktop only. */
  detail?: string;
}

/**
 * The brochure represents both its session themes (p.14) and its summit
 * highlights (p.13) as grids of photo tiles, so both render through this.
 *
 * The duotone is load-bearing, not decoration. Between them the two sets are
 * seventeen unrelated photographs — a violet circuit board, a gold quantum
 * rig, a green wheat field, a banquet hall, a handshake. At full saturation a
 * grid of them reads as clip art pulled from a dozen different decks.
 * Greyscale under a navy `mix-blend-color` layer collapses every one to a
 * single ink, so each grid reads as one designed object; colour returns on
 * hover and focus, which makes the restraint look deliberate rather than like
 * an image that failed to load.
 *
 * `index` is shown only when the caller passes `numbered`, and callers should
 * pass it only when the order is real. Both current sets are ordered by when
 * they happen on the day, so the number tells the reader something; on an
 * unordered set it would be decoration dressed up as information.
 */
export function TileGrid({
  items,
  href,
  numbered = false,
}: {
  items: GridTile[];
  /** Optional destination for every tile. */
  href?: string;
  numbered?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {items.map((item, i) => {
        const body = (
          <>
            <div className="relative aspect-square overflow-hidden rounded-sm ring-1 ring-brand-950/10 group-focus-visible:ring-2 group-focus-visible:ring-brand-800">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                className="object-cover grayscale brightness-[0.82] contrast-[1.2] transition duration-500 group-hover:scale-[1.03] group-hover:brightness-100 group-hover:grayscale-0 group-hover:contrast-100 group-focus-visible:grayscale-0"
              />
              {/* Navy ink — hue and saturation from this layer, luminosity
                  from the greyscale photograph underneath. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-brand-800 opacity-85 mix-blend-color transition-opacity duration-500 group-hover:opacity-0 group-focus-visible:opacity-0"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-brand-950/35 transition-opacity duration-500 group-hover:opacity-0"
              />

              {numbered ? (
                <span
                  aria-hidden
                  className="absolute left-2 top-1.5 font-display text-[11px] font-semibold tabular-nums text-paper/75"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ) : null}

              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/95 via-brand-950/55 to-transparent px-2.5 pb-2 pt-9">
                <span className="block font-display text-[13px] font-semibold leading-tight text-paper">
                  {item.label}
                </span>
              </span>

              {item.detail ? (
                <span className="absolute inset-0 hidden items-end bg-brand-900/92 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
                  <span className="text-[12px] leading-5 text-paper/90">
                    {item.detail}
                  </span>
                </span>
              ) : null}
            </div>
            {item.caption ? (
              <p className="eyebrow mt-1.5 text-brand-900/55">{item.caption}</p>
            ) : null}
          </>
        );

        return (
          <li key={item.slug} className="min-w-0">
            {href ? (
              <Link
                href={href}
                className="group block focus:outline-none"
                aria-label={
                  [item.label, item.caption, item.detail]
                    .filter(Boolean)
                    .join(" — ") || item.label
                }
              >
                {body}
              </Link>
            ) : (
              <div className="group block">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
