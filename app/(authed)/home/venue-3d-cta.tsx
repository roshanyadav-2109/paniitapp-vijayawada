import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The way into the 3D venue map, under the key guests. Its picture is the
 * map itself — the main hall as the map shows it from the aisle — so what
 * the card promises is exactly what opens. The picture is left clear and
 * the words sit under it, where nothing in the hall competes with them.
 */
export function Venue3dCta() {
  return (
    <Link
      href="/map"
      className="group block overflow-hidden rounded-xl bg-[#2A2C30] text-white shadow-[0_10px_30px_-18px_rgba(20,20,22,0.75)]"
    >
      <div className="relative aspect-[2/1] overflow-hidden">
        <Image
          src="/home/venue-3d-hall.webp"
          alt="The main hall at Kala Vedika, in the 3D map"
          fill
          sizes="(min-width: 768px) 720px, 100vw"
          className="object-cover object-[50%_45%] transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-[#2A2C30]/70 px-2.5 py-1 text-[11px] font-medium tracking-wide ring-1 ring-white/25 backdrop-blur-sm">
          3D experience
        </span>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#2A2C30] to-transparent" />
      </div>
      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">Navigate Kala Vedika</h3>
          <p className="mt-1 text-[13px] leading-snug text-white/75">
            Walk the main hall, find any stall and take the lift upstairs, before you arrive.
          </p>
        </div>
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#2A2C30] transition-transform group-hover:translate-x-0.5"
        >
          <ArrowRight className="size-5" strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}
