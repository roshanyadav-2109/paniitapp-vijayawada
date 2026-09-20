import Image from "next/image";
import { ArrowUpRight } from "@/components/icons";
import { EVENT_PRESS } from "@/lib/event-config";

/**
 * Press coverage as link previews — the outlet's own image, headline and
 * standfirst, the way a shared link unfurls in a messaging app.
 *
 * All three come from each article's Open Graph metadata, so the card shows
 * what the publisher chose to show. Images are mirrored into public/press
 * rather than hotlinked: a remote preview is one CDN change away from a hole
 * in the page, and some of these outlets refuse cross-site image requests
 * anyway.
 *
 * A card without an image is a normal state, not a failure — Deccan Chronicle
 * blocks the request — so the layout does not reserve space for one.
 */
export function PressStrip() {
  if (EVENT_PRESS.length === 0) return null;

  return (
    <ul
      className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto scroll-smooth scroll-pl-3 px-3 pb-1 sm:-mx-5 sm:scroll-pl-5 sm:px-5 lg:-mx-6 lg:scroll-pl-6 lg:px-6"
      aria-label="Press coverage"
    >
      {EVENT_PRESS.map((item) => (
        <li
          key={item.href}
          className="w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]"
        >
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full flex-col overflow-hidden rounded-md border border-rule bg-white transition-colors hover:bg-paper-deep/40"
          >
            {item.image ? (
              <span className="relative block aspect-[16/9] w-full bg-paper-deep">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 32vw"
                  className="object-cover"
                />
              </span>
            ) : null}

            <span className="flex flex-1 flex-col gap-2 p-3.5">
              <span className="font-display text-[14.5px] font-semibold leading-snug text-brand-950">
                {item.headline}
              </span>
              <span className="line-clamp-3 text-[12.5px] leading-5 text-brand-900/60">
                {item.summary}
              </span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[12.5px] font-medium text-brand-800">
                Read on {item.outlet}
                <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
