"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bookmark, BookmarkCheck, SlidersHorizontal, X } from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface VenueOption {
  id: string;
  label: string;
}

/**
 * One primary filter inline, everything else behind the filter icon.
 *
 * "My Agenda" is the primary one: it is the toggle people reach for during the
 * day. Recommended and the venue list are secondary and live in the sheet, so
 * the bar stays a single row and needs no surrounding card.
 */
export function AgendaFilters({ venues }: { venues: VenueOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeVenue = sp.get("venue") ?? "all";
  const mineOnly = sp.get("mine") === "1";
  const recommendedOnly = sp.get("recommended") === "1";

  // Number of filters hidden behind the icon that are currently on.
  const secondaryCount = (recommendedOnly ? 1 : 0) + (activeVenue !== "all" ? 1 : 0);

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

  function go(patch: Parameters<typeof buildHref>[0]) {
    router.push(buildHref(patch), { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={buildHref({ mine: mineOnly ? "0" : "1" })}
        scroll={false}
        aria-pressed={mineOnly}
        className={cn(
          "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold transition-colors lg:flex-none lg:px-4",
          mineOnly
            ? "border-brand-800 bg-brand-800 text-white"
            : "border-rule bg-white text-brand-900 hover:bg-paper-deep/40"
        )}
      >
        {mineOnly ? (
          <BookmarkCheck className="size-4" strokeWidth={1.7} />
        ) : (
          <Bookmark className="size-4" strokeWidth={1.7} />
        )}
        My Agenda
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={
              secondaryCount > 0
                ? `Filters (${secondaryCount} active)`
                : "Filters"
            }
            className="relative inline-grid size-10 shrink-0 place-items-center rounded-md border border-rule bg-white text-brand-800 transition-colors hover:bg-paper-deep/40"
          >
            <SlidersHorizontal className="size-[18px]" strokeWidth={1.8} />
            {secondaryCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand-800 text-[10px] font-bold text-white">
                {secondaryCount}
              </span>
            ) : null}
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 px-6 pb-6 pt-2">
            <div>
              <p className="mb-2 eyebrow text-brand-800/75">
                Show
              </p>
              <button
                type="button"
                onClick={() => go({ recommended: recommendedOnly ? "0" : "1" })}
                aria-pressed={recommendedOnly}
                className={cn(
                  "w-full rounded-md border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                  recommendedOnly
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-rule bg-white text-brand-900 hover:bg-paper-deep/40"
                )}
              >
                Recommended for me
              </button>
            </div>

            <div>
              <p className="mb-2 eyebrow text-brand-800/75">
                Venue
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: "all", label: "All venues" }, ...venues].map((venue) => {
                  const active = activeVenue === venue.id;
                  return (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => go({ venue: venue.id })}
                      aria-pressed={active}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        active
                          ? "border-brand-800 bg-brand-800 text-white"
                          : "border-rule bg-white text-brand-900 hover:bg-paper-deep/40"
                      )}
                    >
                      {venue.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {secondaryCount > 0 ? (
              <button
                type="button"
                onClick={() => go({ recommended: "0", venue: "all" })}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-800 hover:text-brand-900"
              >
                <X className="size-3.5" strokeWidth={2} />
                Clear filters
              </button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
