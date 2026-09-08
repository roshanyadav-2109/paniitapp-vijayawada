"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VenueOption {
  id: string;
  label: string;
}

export function AgendaFilters({ venues }: { venues: VenueOption[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeVenue = sp.get("venue") ?? "all";
  const mineOnly = sp.get("mine") === "1";
  const recommendedOnly = sp.get("recommended") === "1";

  function buildHref(patch: {
    venue?: string;
    mine?: string;
    recommended?: string;
  }): string {
    const next = new URLSearchParams(sp.toString());
    next.delete("track");
    if (patch.venue !== undefined) {
      if (patch.venue === "all") next.delete("venue");
      else next.set("venue", patch.venue);
    }
    if (patch.mine !== undefined) {
      if (patch.mine === "0") next.delete("mine");
      else next.set("mine", patch.mine);
    }
    if (patch.recommended !== undefined) {
      if (patch.recommended === "0") next.delete("recommended");
      else next.set("recommended", patch.recommended);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={buildHref({ mine: mineOnly ? "0" : "1" })}
          scroll={false}
          aria-pressed={mineOnly}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-[13px] font-semibold transition-colors",
            mineOnly
              ? "border-brand-800 bg-brand-800 text-white"
              : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
          )}
        >
          {mineOnly ? (
            <BookmarkCheck className="size-4" strokeWidth={1.7} />
          ) : (
            <Bookmark className="size-4" strokeWidth={1.7} />
          )}
          My Agenda
        </Link>
        <Link
          href={buildHref({ recommended: recommendedOnly ? "0" : "1" })}
          scroll={false}
          aria-pressed={recommendedOnly}
          className={cn(
            "flex items-center justify-center rounded-md border px-3 py-2.5 text-[13px] font-semibold transition-colors",
            recommendedOnly
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
          )}
        >
          Recommended
        </Link>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-800/75">
          Venue
        </p>
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0">
          {[{ id: "all", label: "All venues" }, ...venues].map((venue) => {
            const active = activeVenue === venue.id;
            return (
              <Link
                key={venue.id}
                href={buildHref({ venue: venue.id })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  active
                    ? "border-brand-800 bg-brand-800 text-white"
                    : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
                )}
              >
                {venue.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
