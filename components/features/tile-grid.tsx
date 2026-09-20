import Image from "next/image";
import Link from "next/link";

export interface GridTile {
  slug: string;
  label: string;
  image: string;
  /** Small line under the tile — a time, a room, a panel number. */
  caption?: string;
  /** One line revealed on hover, desktop only. Photo tiles only. */
  detail?: string;
}

/**
 * Grid of square tiles, in two flavours the brochure itself uses.
 *
 * `photo` (the default) is for photography — the summit highlights. Those
 * nine images have nothing in common: a banquet hall, a handshake, a lecture
 * theatre. Rendering them greyscale under a navy `mix-blend-color` layer
 * collapses them to one ink so the grid reads as a single object, with colour
 * returning on hover; the label sits over the image on a scrim.
 *
 * `icon` is for illustrated artwork — the session themes. The same duotone
 * would destroy them: they are already a designed set, and their meaning is
 * carried by colour (a green field, a gold quantum rig, the tricolour on the
 * parliament dome). So they render as supplied, with the label underneath
 * rather than over the art, which is how the source sheet presents them.
 */
export function TileGrid({
  items,
  href,
  numbered = false,
  variant = "photo",
  duotone,
  labelOutside,
  fit = "cover",
}: {
  items: GridTile[];
  /** Optional destination for every tile. */
  href?: string;
  /** Only pass this when the order means something. */
  numbered?: boolean;
  variant?: "photo" | "icon";
  /**
   * Navy ink over greyscale. Defaults on for photo tiles, where it exists to
   * collapse a set of unrelated stock images to one colour. Turn it off when
   * the photographs are worth seeing as they are — it tints everything
   * violet, which is the wrong answer for a set that already looks like a
   * set.
   */
  duotone?: boolean;
  /**
   * Put the label under the tile instead of over the picture. Defaults to
   * following the variant, but the two are separate decisions: a scrim over a
   * photograph is only worth it when the picture can carry text, and on a
   * busy one the label competes with the image whatever the treatment.
   */
  labelOutside?: boolean;
  /**
   * Show the whole picture rather than filling the tile with it. `cover`
   * crops whatever does not fit the square; `contain` fits the image inside
   * and lets the tile show through around it.
   */
  fit?: "cover" | "contain";
}) {
  const isIcon = variant === "icon";
  const ink = duotone ?? !isIcon;
  const outside = labelOutside ?? isIcon;

  return (
    <ul
      className={
        // Icons scroll in two rows; photographs stay a plain grid.
        //
        // Photos keep the grid because their label sits over the image, so a
        // narrow tile squeezes the text as well as the picture.
        isIcon
          ? // Two rows that scroll sideways. Four across fitted the whole set
            // on screen but left each tile around 88px, which read as cramped.
            // At 104px three columns fit whole with ~55px of the fourth showing, and that
            // peek is what tells you it scrolls. `grid-flow-col` with two rows
            // fills column by column, so each pair stays together as you swipe.
            //
            // scroll-pl-* matters: `snap-start` aligns to the scroll port's
            // padding edge, so without it the first tile snaps flush to the
            // screen edge, out of line with the heading above it.
            "no-scrollbar -mx-3 grid snap-x grid-flow-col grid-rows-2 auto-cols-[104px] gap-x-4 gap-y-5 overflow-x-auto scroll-smooth scroll-pl-3 px-3 pb-1 sm:-mx-5 sm:auto-cols-[136px] sm:scroll-pl-5 sm:px-5 lg:-mx-6 lg:auto-cols-[150px] lg:scroll-pl-6 lg:px-6"
          : "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5"
      }
    >
      {items.map((item, i) => {
        const body = (
          <>
            {/* rounded-sm (2px): only the photographs show this corner — the
                sector tiles are transparent cut-outs, so their radius clips
                nothing visible.

                No resting ring and no ground behind the picture either. The
                ring drew a hairline around artwork that already ends cleanly,
                and the ground showed as letterbox bars wherever a contained
                image did not fill the square. */}
            <div className="relative aspect-square overflow-hidden rounded-sm group-focus-visible:ring-2 group-focus-visible:ring-brand-800">
              <Image
                src={item.image}
                alt=""
                fill
                sizes={
                  isIcon
                    ? "150px"
                    : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                }
                className={
                  ink
                    ? "object-cover grayscale brightness-[0.82] contrast-[1.2] transition duration-500 group-hover:brightness-100 group-hover:grayscale-0 group-hover:contrast-100 group-focus-visible:grayscale-0"
                    : `${fit === "contain" ? "object-contain" : "object-cover"} transition duration-500`
                }
              />

              {ink ? (
                <>
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
                </>
              ) : null}

              {numbered ? (
                // Without the ink layer the picture underneath can be any
                // brightness, and white numerals vanished on the pale ones.
                // A chip gives them their own ground; over the duotone the
                // scrim already does that, so it stays bare there.
                <span
                  aria-hidden
                  className={
                    ink
                      ? "absolute left-2 top-1.5 font-display text-[11px] font-semibold tabular-nums text-paper/75"
                      : "absolute left-1.5 top-1.5 rounded-[3px] bg-brand-950/75 px-1.5 py-0.5 font-display text-[10.5px] font-semibold tabular-nums leading-none text-paper"
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ) : null}

              {outside ? null : (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/95 via-brand-950/55 to-transparent px-2.5 pb-2 pt-9">
                  <span className="block font-display text-[13px] font-semibold leading-tight text-paper">
                    {item.label}
                  </span>
                </span>
              )}

              {item.detail && !outside ? (
                <span className="absolute inset-0 hidden items-end bg-brand-900/92 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
                  <span className="text-[12px] leading-5 text-paper/90">
                    {item.detail}
                  </span>
                </span>
              ) : null}
            </div>

            {outside ? (
              <p className="mt-2 font-display text-[12px] font-semibold leading-snug text-brand-950">
                {item.label}
              </p>
            ) : null}
            {item.caption ? (
              <p className="eyebrow mt-1 text-brand-900/55">{item.caption}</p>
            ) : null}
          </>
        );

        return (
          <li key={item.slug} className={isIcon ? "snap-start" : "min-w-0"}>
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
