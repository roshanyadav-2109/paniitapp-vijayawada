"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Layers, RotateCcw } from "lucide-react";
import { Loader2, MapPin, Search } from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FLOOR_NAMES,
  FLOOR_ORDER,
  INSIDE_VIEWS,
  STALLS,
  ZONE_NAMES,
  type FloorKey,
  type StallZone,
} from "@/lib/venue-3d";

// three.js is most of a megabyte. It loads on this page and nowhere else,
// and only in the browser — there is nothing to render on the server.
const VenueCanvas = dynamic(() => import("./venue-canvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#EAF0F7]">
      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-brand-900/60">
        <Loader2 className="size-4 animate-spin" /> Building the venue…
      </span>
    </div>
  ),
});

/** Kept here rather than imported from the canvas, so the page does not pull three.js in to colour a legend. */
const ZONE_COLOR: Record<StallZone, string> = {
  exhibition: "#0EA5E9",
  "prefunction-1": "#10B981",
  "prefunction-2": "#8B5CF6",
};

const ZONE_SHORT: Record<StallZone, string> = {
  exhibition: "Exhibition",
  "prefunction-1": "Pre-function 1",
  "prefunction-2": "Pre-function 2",
};

export interface Occupant {
  code: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  href: string;
}

/**
 * A stall's code from however somebody typed or stored it: "EX-S14",
 * "ex s14", "PF1 3", "pf1-s3". Returns null for a bare number, which is
 * ambiguous — every area numbers its own stalls from S1.
 */
function normaliseCode(raw: string): string | null {
  const m = raw.trim().toUpperCase().replace(/\s+/g, " ").match(/^(EX|PF1|PF2)[\s-]*S?\s*(\d{1,2})$/);
  return m ? `${m[1]}-S${Number(m[2])}` : null;
}

/** "14" or "S14", matched against every area. */
function bareNumber(raw: string): string | null {
  const m = raw.trim().toUpperCase().match(/^S?\s*(\d{1,2})$/);
  return m ? `S${Number(m[1])}` : null;
}

export function VenueMap({ occupants }: { occupants: Occupant[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ code: string; nonce: number } | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<FloorKey>("ground");
  const [showPlan, setShowPlan] = useState(false);
  // The open map, roof off, is the default; inside puts the roof back on
  // and stands you in the main hall.
  const [inside, setInside] = useState(false);
  const [spot, setSpot] = useState(0);
  // The layer the canvas draws its floating labels into. A state, not a
  // ref, so the canvas hears about it once it exists.
  const [labelLayer, setLabelLayer] = useState<HTMLDivElement | null>(null);

  const byCode = useMemo(() => {
    const m: Record<string, Occupant> = {};
    for (const o of occupants) {
      const code = normaliseCode(o.code);
      if (code) m[code] = { ...o, code };
    }
    return m;
  }, [occupants]);

  const occupied = useMemo(
    () => Object.fromEntries(Object.values(byCode).map((o) => [o.code, o.name])),
    [byCode]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const code = normaliseCode(query);
    const bare = bareNumber(query);
    const out: { code: string; label: string; sub: string }[] = [];
    for (const s of STALLS) {
      const holder = byCode[s.code];
      const hitCode = code === s.code || bare === s.label;
      const hitName = holder?.name.toLowerCase().includes(q);
      if (hitCode || hitName) {
        out.push({
          code: s.code,
          label: holder ? `${s.label} · ${holder.name}` : s.label,
          sub: ZONE_NAMES[s.zone],
        });
      }
    }
    return out.slice(0, 6);
  }, [query, byCode]);

  function go(code: string) {
    setQuery("");
    // Every stall is on the ground floor; a search from upstairs comes down,
    // and from inside the hall comes out to the map.
    setInside(false);
    setFloor("ground");
    setSelected(code);
    setFocus({ code, nonce: Date.now() });
  }

  const stall = selected ? STALLS.find((s) => s.code === selected) : undefined;
  const holder = selected ? byCode[selected] : undefined;

  return (
    // Edge to edge on a phone: the page's side padding is taken back so the
    // building gets the whole width, and the controls sit on the canvas
    // rather than above it.
    <div className="-mx-3 -mt-2 sm:-mx-5 lg:mx-0 lg:mt-0">
      <div className="venue-stage relative w-full overflow-hidden bg-[#EAF0F7] lg:rounded-lg lg:ring-1 lg:ring-rule">
        <VenueCanvas
          floor={floor}
          showPlan={showPlan}
          occupied={occupied}
          selected={selected}
          onSelect={setSelected}
          focus={focus}
          resetNonce={resetNonce}
          labelLayer={labelLayer}
          inside={inside}
          spot={spot}
        />
        <div ref={setLabelLayer} className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" />

        {/* search */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-2 sm:left-4 sm:right-auto sm:w-[340px]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-900/45" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a stall or a company"
              className="h-10 w-full min-w-0 rounded-full border border-white/70 bg-white/95 pl-9 pr-3 text-[16px] text-brand-950 shadow-[0_4px_14px_rgba(15,23,42,0.12)] outline-none placeholder:text-brand-900/45 focus:border-brand-300 sm:text-[14px]"
            />
            {matches.length > 0 ? (
              <ul className="absolute inset-x-0 top-11 overflow-hidden rounded-xl border border-rule bg-white shadow-lg">
                {matches.map((m) => (
                  <li key={m.code}>
                    <button
                      type="button"
                      onClick={() => go(m.code)}
                      className="flex w-full flex-col items-start px-3.5 py-2 text-left hover:bg-paper"
                    >
                      <span className="text-[13px] font-semibold text-brand-950">{m.label}</span>
                      <span className="text-[11px] text-brand-900/60">{m.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim() ? (
              <p className="absolute inset-x-0 top-11 rounded-xl border border-rule bg-white px-3.5 py-2 text-[12px] text-brand-900/60 shadow-lg">
                No stall or company by that name.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setResetNonce((n) => n + 1);
            }}
            aria-label="Show the whole venue"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/70 bg-white/95 text-brand-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)]"
          >
            <RotateCcw className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Floors, top to bottom as a lift panel reads, and the drawing
            behind them as a layer to switch on. Inside, the panel is the
            lift: it takes you up or down to that floor. */}
        <div className="absolute right-3 top-16 z-10 flex flex-col items-center gap-2">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_4px_14px_rgba(15,23,42,0.12)]">
            {[...FLOOR_ORDER].reverse().map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFloor(f);
                  setSpot(0);
                  setSelected(null);
                }}
                aria-label={`${FLOOR_NAMES[f]} floor`}
                aria-pressed={floor === f}
                className={
                  floor === f
                    ? "grid size-10 place-items-center bg-brand-800 text-[13px] font-bold text-white"
                    : "grid size-10 place-items-center text-[13px] font-bold text-brand-900 hover:bg-paper"
                }
              >
                {f === "basement" ? "B" : f === "ground" ? "G" : "1"}
              </button>
            ))}
          </div>
          <button
            type="button"
            hidden={inside}
            onClick={() => setShowPlan((v) => !v)}
            aria-label={showPlan ? "Hide the floor plan" : "Show the floor plan"}
            aria-pressed={showPlan}
            className={
              showPlan
                ? "grid size-10 place-items-center rounded-full bg-brand-800 text-white shadow-[0_4px_14px_rgba(15,23,42,0.12)]"
                : "grid size-10 place-items-center rounded-full border border-white/70 bg-white/95 text-brand-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)]"
            }
          >
            <Layers className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Roof off to find your way, or roof on to stand in the hall. */}
        <div
          role="radiogroup"
          aria-label="View"
          className="absolute left-3 top-16 z-10 flex rounded-full border border-white/70 bg-white/95 p-0.5 shadow-[0_4px_14px_rgba(15,23,42,0.12)]"
        >
          {[
            { on: false, label: "Roof open" },
            { on: true, label: "Inside" },
          ].map((v) => (
            <button
              key={v.label}
              type="button"
              role="radio"
              aria-checked={inside === v.on}
              onClick={() => {
                setSelected(null);
                setSpot(0);
                setInside(v.on);
              }}
              className={
                inside === v.on
                  ? "rounded-full bg-brand-800 px-3 py-1 text-[12px] font-semibold text-white"
                  : "rounded-full px-3 py-1 text-[12px] font-semibold text-brand-900"
              }
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* which floor this is, where a lift would say it */}
        {inside ? (
          <p className="pointer-events-none absolute left-3 top-[100px] z-10 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-brand-900 shadow-sm">
            {FLOOR_NAMES[floor]} floor · tap {floor === "ground" ? "the floor or a door" : "the floor"} to walk · drag to look
          </p>
        ) : (
          <p className="pointer-events-none absolute left-3 top-[100px] z-10 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-brand-900 shadow-sm">
            {FLOOR_NAMES[floor]} floor
          </p>
        )}

        {/* The neighbourhood is OpenStreetMap's; its licence asks for this. */}
        <a
          hidden={inside}
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-12 right-3 z-10 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-brand-900/70"
        >
          &copy; OpenStreetMap contributors
        </a>

        {/* where to stand, inside */}
        {inside ? (
          <div className="no-scrollbar absolute inset-x-0 bottom-2 z-10 flex gap-1.5 overflow-x-auto px-3">
            {INSIDE_VIEWS[floor].map((v, i) => (
              <button
                key={v.name}
                type="button"
                onClick={() => setSpot(i)}
                aria-pressed={spot === i}
                className={
                  spot === i
                    ? "shrink-0 rounded-full bg-brand-800 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm"
                    : "shrink-0 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-brand-900 shadow-sm"
                }
              >
                {v.name}
              </button>
            ))}
          </div>
        ) : null}

        {/* legend */}
        {floor === "ground" && !inside ? (
          <div className="no-scrollbar absolute inset-x-0 bottom-2 z-10 flex gap-1.5 overflow-x-auto px-3">
            {(Object.keys(ZONE_COLOR) as StallZone[]).map((z) => (
              <span
                key={z}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-900 shadow-sm"
              >
                <span className="size-2.5 rounded-sm" style={{ background: ZONE_COLOR[z] }} />
                {ZONE_SHORT[z]}
              </span>
            ))}
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-900 shadow-sm">
              <span className="size-2.5 rounded-sm bg-[#16A34A]" /> Entrance
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-900 shadow-sm">
              <span className="size-2.5 rounded-sm bg-[#059669]" /> One-way loop
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-brand-900 shadow-sm">
              <span className="size-2.5 rounded-sm bg-[#1B1464]" /> Backdrop
            </span>
          </div>
        ) : null}
      </div>

      <Sheet open={!!stall} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto"
          // The stall the sheet describes stays in sight above it.
          overlayClassName="bg-brand-950/10 backdrop-blur-none"
        >
          {stall ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span
                    className="inline-grid h-7 min-w-9 place-items-center rounded-md px-2 text-[13px] font-bold text-white"
                    style={{ background: ZONE_COLOR[stall.zone] }}
                  >
                    {stall.label}
                  </span>
                  {holder ? holder.name : "Available"}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" strokeWidth={1.8} />
                  {ZONE_NAMES[stall.zone]}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 pb-4">
                {holder ? (
                  <Link
                    href={holder.href}
                    className="flex items-center gap-3 rounded-lg border border-rule bg-white p-3 transition-colors hover:bg-paper"
                  >
                    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-paper-deep">
                      {holder.logo_url ? (
                        <Image
                          src={holder.logo_url}
                          alt={holder.name}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-[13px] font-bold text-brand-800">
                          {holder.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-brand-950">
                        {holder.name}
                      </span>
                      {holder.category ? (
                        <span className="block truncate text-[12px] text-brand-900/60">
                          {holder.category}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ) : (
                  <p className="text-[13px] leading-5 text-brand-900/65">
                    Nobody has been allocated this stall yet.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

