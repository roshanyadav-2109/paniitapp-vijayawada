"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Search, Store } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export interface ExhibitorRow {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  category: string | null;
  booth_number: string | null;
  location_floor: string | null;
  website: string | null;
}

export function ExhibitorsClient({
  initialRows,
}: {
  initialRows: ExhibitorRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.tagline?.toLowerCase().includes(q) ?? false) ||
        (r.category?.toLowerCase().includes(q) ?? false) ||
        (r.booth_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialRows, search]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-brand-800/55" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exhibitors, booths, categories..."
          aria-label="Search exhibitors"
          className="h-11 w-full rounded-lg border border-brand-100 bg-white pl-10 pr-3.5 text-sm font-medium text-brand-950 outline-none placeholder:font-normal placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {initialRows.length === 0 ? <Store /> : <Search />}
            </EmptyMedia>
            <EmptyTitle>
              {initialRows.length === 0 ? "No exhibitors yet" : "No matches"}
            </EmptyTitle>
            <EmptyDescription>
              {initialRows.length === 0
                ? "The show-floor directory will appear here once exhibitors are onboarded."
                : "Try a different search term."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <Link
                href={`/exhibitors/${e.id}`}
                className="group flex items-start gap-3 rounded-lg border border-brand-100 bg-white p-3 transition-colors hover:bg-brand-50/30"
              >
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-brand-100">
                  {e.logo_url ? (
                    <Image
                      src={e.logo_url}
                      alt={e.name}
                      width={56}
                      height={56}
                      className="size-full object-contain p-1"
                    />
                  ) : (
                    <Store className="size-5 text-brand-800/65" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-brand-950">
                    {e.name}
                  </div>
                  {e.tagline ? (
                    <div className="mt-0.5 truncate text-[12px] text-brand-900/75">
                      {e.tagline}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {e.category ? <MetaTag>{e.category}</MetaTag> : null}
                    {e.booth_number || e.location_floor ? (
                      <MetaTag>
                        <MapPin className="size-3" strokeWidth={1.8} />
                        {[e.booth_number, e.location_floor]
                          .filter(Boolean)
                          .join(" · ")}
                      </MetaTag>
                    ) : null}
                    {e.website ? (
                      <MetaTag>
                        <ExternalLink className="size-3" strokeWidth={1.8} />
                        Website
                      </MetaTag>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] border border-slate-900/25 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
      {children}
    </span>
  );
}
