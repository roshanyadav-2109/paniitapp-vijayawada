"use client";

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { rangeIST } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface VenueRow {
  id: string;
  name: string;
  floor: string | null;
  map_floor: number | null;
  map_x: number | null;
  map_y: number | null;
  capacity: number | null;
}

export interface SessionAtVenue {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  venue_id: string | null;
  track: string | null;
}

const CANVAS_W = 600;
const CANVAS_H = 400;
const HALL_W = 130;
const HALL_H = 70;
const PADDING = 24;

function layoutVenues(venues: VenueRow[]): { v: VenueRow; x: number; y: number; w: number; h: number }[] {
  const withCoords = venues.filter((v) => v.map_x != null && v.map_y != null);
  const useGrid = withCoords.length < venues.length;

  if (!useGrid) {
    return venues.map((v) => ({
      v,
      x: Math.round(((v.map_x ?? 50) / 100) * (CANVAS_W - HALL_W - PADDING * 2)) + PADDING,
      y: Math.round(((v.map_y ?? 50) / 100) * (CANVAS_H - HALL_H - PADDING * 2)) + PADDING,
      w: HALL_W,
      h: HALL_H,
    }));
  }

  const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(venues.length))));
  const gapX = 16;
  const gapY = 20;
  return venues.map((v, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return {
      v,
      x: PADDING + c * (HALL_W + gapX),
      y: PADDING + r * (HALL_H + gapY),
      w: HALL_W,
      h: HALL_H,
    };
  });
}

function floorOf(v: VenueRow): number {
  if (v.map_floor != null) return v.map_floor;
  if (v.floor != null && /^\d+$/.test(v.floor)) return Number(v.floor);
  return 0;
}

function floorLabel(n: number): string {
  if (n === 0) return "Ground Floor";
  if (n === 1) return "1st Floor";
  if (n === 2) return "2nd Floor";
  if (n === 3) return "3rd Floor";
  return `Floor ${n}`;
}

export function FloorMap({
  venues,
  sessions,
}: {
  venues: VenueRow[];
  sessions: SessionAtVenue[];
}) {
  const floors = useMemo(() => {
    const set = new Set<number>();
    venues.forEach((v) => set.add(floorOf(v)));
    return Array.from(set).sort((a, b) => a - b);
  }, [venues]);

  const [floor, setFloor] = useState<number>(floors[0] ?? 0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VenueRow | null>(null);

  const floorVenues = useMemo(
    () => venues.filter((v) => floorOf(v) === floor),
    [venues, floor]
  );

  const matchedIds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return new Set<string>();
    return new Set(
      floorVenues.filter((v) => v.name.toLowerCase().includes(term)).map((v) => v.id)
    );
  }, [search, floorVenues]);

  const positioned = useMemo(() => layoutVenues(floorVenues), [floorVenues]);

  const venueSessions = useMemo(() => {
    if (!selected) return [];
    return sessions
      .filter((s) => s.venue_id === selected.id)
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [selected, sessions]);

  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
      {/* Left column: controls */}
      <aside className="mb-5 flex flex-col gap-3 lg:mb-0 lg:sticky lg:top-[5.5rem] lg:self-start">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Floor
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFloor(f)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors lg:text-left",
                  f === floor
                    ? "bg-brand-800 text-white lg:bg-brand-50 lg:text-brand-800"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 lg:border-0"
                )}
                aria-current={f === floor ? "page" : undefined}
              >
                {floorLabel(f)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Find a hall
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              className="pl-9"
              aria-label="Find a hall"
            />
          </div>
        </div>

        {/* Venue list for this floor, on desktop only — mobile shows it below the SVG */}
        <div className="hidden rounded-lg border border-slate-200 bg-white p-3 lg:block">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            All venues on this floor
          </div>
          <ul className="flex flex-col gap-0.5">
            {floorVenues.map((v) => {
              const highlighted = matchedIds.has(v.id);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(v)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      highlighted
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{v.name}</span>
                    </span>
                    {v.capacity ? (
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                        {v.capacity}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Right column: floor plan + mobile list */}
      <div className="min-w-0">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="block w-full"
            role="img"
            aria-label={`${floorLabel(floor)} map`}
          >
            <rect
              x={4}
              y={4}
              width={CANVAS_W - 8}
              height={CANVAS_H - 8}
              rx={12}
              className="fill-slate-50 stroke-slate-300"
              strokeWidth={1.5}
            />
            {positioned.map(({ v, x, y, w, h }) => {
              const highlighted = matchedIds.has(v.id);
              return (
                <g
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(v);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={8}
                    className={cn(
                      "transition-colors",
                      highlighted
                        ? "fill-brand-100 stroke-brand-800"
                        : "fill-white stroke-slate-300 hover:fill-slate-100"
                    )}
                    strokeWidth={highlighted ? 2 : 1.25}
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "select-none text-[12px] font-medium",
                      highlighted ? "fill-brand-900" : "fill-slate-700"
                    )}
                  >
                    {v.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Mobile-only venue list (desktop has it in left column) */}
        <div className="mt-4 lg:hidden">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {floorLabel(floor)} · {floorVenues.length} venue{floorVenues.length === 1 ? "" : "s"}
          </h2>
          <ul className="flex flex-col gap-2">
            {floorVenues.map((v) => {
              const highlighted = matchedIds.has(v.id);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(v)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
                      highlighted
                        ? "border-brand-800 bg-brand-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <MapPin className="size-4 text-slate-400" />
                      <span className="text-sm font-medium text-brand-900">{v.name}</span>
                    </span>
                    {v.capacity ? (
                      <span className="text-xs tabular-nums text-slate-500">
                        Capacity {v.capacity}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.floor ?? floorLabel(floorOf(selected))}
                  {selected.capacity ? ` · Capacity ${selected.capacity}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="px-6 pb-6 pt-2">
                {venueSessions.length === 0 ? (
                  <p className="text-sm text-slate-500">No sessions in this venue.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {venueSessions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="text-xs font-medium tabular-nums text-slate-900">
                          {rangeIST(s.start_at, s.end_at)}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-brand-900">
                          {s.title}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
