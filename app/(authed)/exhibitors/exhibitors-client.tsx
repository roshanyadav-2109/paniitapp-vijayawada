"use client";

import { EmptyArt } from "@/components/features/empty-art";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "@/components/icons";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRememberedState } from "@/hooks/use-remembered-state";
import { PAVILIONS, pavilionOf, type Pavilion } from "@/lib/pavilions";

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
  // One pavilion is always chosen, Startups to begin with; the choice is
  // kept for the visit, so Back from a stall returns to it.
  const [chosen, setOnly] = useRememberedState<string | null>("pavilion", null);

  // The pavilions that have stalls, in the expo's own order.
  const present = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of initialRows) {
      const k = pavilionOf(r.category).key;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const known = PAVILIONS.filter((p) => counts.has(p.key));
    const rest = [...counts.keys()].filter((k) => !PAVILIONS.some((p) => p.key === k)).map((k) => pavilionOf(k));
    return [...known, ...rest].map((p) => ({ p, n: counts.get(p.key) ?? 0 }));
  }, [initialRows]);

  const only = present.some(({ p }) => p.key === chosen) ? chosen : (present[0]?.p.key ?? null);

  // A search looks across every pavilion; otherwise, the chosen one.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (!q) return !only || pavilionOf(r.category).key === only;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.tagline?.toLowerCase().includes(q) ?? false) ||
        (r.category?.toLowerCase().includes(q) ?? false) ||
        (r.location_floor?.toLowerCase().includes(q) ?? false) ||
        (r.booth_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialRows, search, only]);


  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-brand-800" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exhibitors, stalls, pavilions"
          aria-label="Search exhibitors"
          className="h-11 w-full rounded-[4px] border border-rule bg-white pl-10 pr-3.5 text-sm text-brand-950 outline-none placeholder:text-brand-800 focus:border-brand-800 focus:ring-2 focus:ring-rule"
        />
      </div>

      {/* The pavilions, by their pictures: tap one to see only its stalls,
          tap it again for everyone. Pinned to the top once scrolled to, so
          they stay to hand all the way down the list. */}
      {initialRows.length > 0 ? (
        <div className="sticky top-0 z-20 -mx-3 mb-4 bg-background pt-[env(safe-area-inset-top)] sm:mx-0">
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-3 pb-2 pt-2 sm:px-1">
          {present.map(({ p }) => (
            <PavilionTile key={p.key} p={p} active={only === p.key} onClick={() => setOnly(p.key)} />
          ))}
        </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="mb-1">
              <EmptyArt name={initialRows.length === 0 ? "empty-expo" : "empty-search"} />
            </EmptyMedia>
            <EmptyTitle>{initialRows.length === 0 ? "No exhibitors yet" : "No matches"}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Grid rows={filtered} />
      )}
    </div>
  );
}

function PavilionTile({ p, active, onClick }: { p: Pavilion; active: boolean; onClick: () => void }) {
  // The icon on its own, nothing behind it; the chosen one's name is set
  // in semibold.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-[84px] shrink-0 snap-start flex-col items-center gap-1 text-center transition-transform active:scale-95"
    >
      <span className="relative block size-[68px]">
        <Image src={p.art} alt="" fill sizes="68px" className="object-contain" />
      </span>
      <span className={`text-[12px] leading-tight text-brand-950 ${active ? "font-semibold" : "font-normal"}`}>{p.short}</span>
    </button>
  );
}

function Grid({ rows }: { rows: ExhibitorRow[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((e) => (
        <li key={e.id}>
          <ExhibitorCard e={e} />
        </li>
      ))}
    </ul>
  );
}

/** One stall to a row: its logo or initials, its name and what it does, and where it is. */
function ExhibitorCard({ e }: { e: ExhibitorRow }) {
  return (
    <Link
      href={`/exhibitors/${e.id}`}
      className="flex items-start gap-4 py-5 transition-opacity active:opacity-70"
    >
      <Mark e={e} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-semibold leading-snug text-brand-950">{e.name}</h3>
        {e.tagline ? (
          <p className="mt-1 line-clamp-2 font-[family-name:var(--font-poppins)] text-[14px] font-normal leading-normal text-brand-950">{e.tagline}</p>
        ) : null}
        {e.booth_number || e.location_floor ? (
          <p className="mt-2 text-[14px] text-brand-950">
            {e.booth_number ? <span className="font-medium">Stall {e.booth_number}</span> : null}
            {e.booth_number && e.location_floor ? <span className="mx-2">|</span> : null}
            {e.location_floor}
          </p>
        ) : null}
        {/* The whole row opens the stall; this says so. */}
        <span className="mt-3 inline-flex h-9 items-center rounded-[4px] bg-brand-950 px-4 text-[13.5px] font-medium text-white">
          Explore
        </span>
      </div>
    </Link>
  );
}

/** The logo, plainly; or, without one, its initials. */
function Mark({ e }: { e: ExhibitorRow }) {
  return (
    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[4px] border border-rule bg-white">
      {e.logo_url ? (
        <Image src={e.logo_url} alt="" width={64} height={64} className="size-full object-contain p-1.5" />
      ) : (
        <span className="text-[19px] font-semibold tracking-tight text-brand-950">{monogram(e.name)}</span>
      )}
    </div>
  );
}

function monogram(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/[\s·,/&-]+/)
    .filter((w) => w && !/^(of|and|the|for|at|on|pvt|ltd|private|limited)$/i.test(w));
  // One word that is an acronym (CDAC, CDOT) keeps two of its letters.
  if (words.length === 1 && words[0] === words[0]!.toUpperCase()) return words[0]!.slice(0, 2);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("") || "•";
}
