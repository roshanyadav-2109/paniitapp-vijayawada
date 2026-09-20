import Image from "next/image";
import type { EventScaleStat } from "@/lib/event-config";

/**
 * The size of the summit in four figures, under the masthead.
 *
 * One row at every width, including a phone, which is the constraint that
 * shapes the rest: four blocks across 328px leaves about 77px each, so the
 * label is the short form, the figure is 17px rather than 28px, and the
 * mark sits above them both instead of beside.
 *
 * Brand navy rather than the near-black of the quick-action tiles below —
 * two rows of solid blocks want to be told apart, and this is the lighter
 * of the two. The brochure marks are red on white artwork, so they are
 * knocked out to white the same way the action tiles do it: brightness-0
 * flattens to black, invert lifts it to white. A raster PNG cannot be
 * recoloured with `fill`.
 */
export function EventScale({ stats }: { stats: EventScaleStat[] }) {
  if (stats.length === 0) return null;

  return (
    <dl className="grid grid-cols-4 gap-1.5 sm:gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-start gap-1.5 rounded-md bg-brand-800 px-1 py-3 text-center sm:px-2 sm:py-4"
        >
          <Image
            src={stat.icon}
            alt=""
            width={22}
            height={22}
            className="size-[20px] shrink-0 brightness-0 invert sm:size-[24px]"
          />
          <dt className="sr-only">{stat.label}</dt>
          <dd className="min-w-0">
            <span className="block font-display text-[17px] font-semibold leading-none tabular-nums text-white sm:text-[21px]">
              {stat.value}
            </span>
            <span className="mt-1 block text-[10px] leading-tight text-white/70 sm:text-[11.5px]">
              {stat.short}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
