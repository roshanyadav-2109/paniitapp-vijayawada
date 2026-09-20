"use client";

import { EmptyArt } from "@/components/features/empty-art";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Loader2, X } from "@/components/icons";
import { SocialActions } from "@/components/features/social-actions";
import { createClient } from "@/lib/supabase/client";
import { EVENT_ID } from "@/lib/event-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IIT_CAMPUSES, INTERESTS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export interface AttendeeRow {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  role: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  interests: string[] | null;
  photo_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  available_for_meetings: boolean | null;
  office_hours_enabled: boolean | null;
}

type SubTab = "foryou" | "people" | "connections";

interface Filters {
  q: string;
  role: string | null;
  campuses: string[];
  yearMin: number;
  yearMax: number;
  interests: string[];
  availableOnly: boolean;
}

const PAGE_SIZE = 50;
const YEAR_MIN = 1970;
const YEAR_MAX = 2025;

function emptyFilters(): Filters {
  return {
    q: "",
    role: null,
    campuses: [],
    yearMin: YEAR_MIN,
    yearMax: YEAR_MAX,
    interests: [],
    availableOnly: false,
  };
}

function activeExtraCount(f: Filters): number {
  return (
    f.campuses.length +
    f.interests.length +
    (f.yearMin > YEAR_MIN ? 1 : 0) +
    (f.yearMax < YEAR_MAX ? 1 : 0) +
    (f.availableOnly ? 1 : 0)
  );
}

function shortCampus(name: string | null): string | null {
  if (!name) return null;
  if (name.startsWith("IIT ")) return name.replace(/^IIT\s+/, "");
  return name;
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

export interface RecommendedRow extends AttendeeRow {
  /** Short phrases explaining why this person surfaced. */
  matchReasons: string[];
}

export function NetworkingClient({
  initialRows,
  roles,
  userId,
  recommended,
  canMatch,
}: {
  recommended: RecommendedRow[];
  canMatch: boolean;
  initialRows: AttendeeRow[];
  roles: string[];
  userId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  // Land on "For you" when we have something to recommend — that is the
  // reason to open this tab at a 800-person summit.
  const [tab, setTab] = useState<SubTab>(
    recommended.length > 0 ? "foryou" : "people",
  );
  const [rows, setRows] = useState<AttendeeRow[]>(initialRows);
  const [connections, setConnections] = useState<AttendeeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialRows.length < PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce search input into filters.q
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, q: searchInput.trim() })),
      300,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (
      offset: number,
      f: Filters,
    ): Promise<{ rows: AttendeeRow[]; total: number | null }> => {
      // Ask Postgres for the exact total alongside the rows so the count we
      // show reflects everyone matching the filter — not just the page that's
      // been paginated into view.
      let q = supabase
        .from("profiles")
        // Inner join scopes the directory to this summit's participants;
        // profiles itself is shared with the other edition.
        .select(
          "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled, event_participants!inner(event_id)",
          { count: "exact" },
        )
        .eq("event_participants.event_id", EVENT_ID)
        .order("full_name", { ascending: true, nullsFirst: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (f.q) {
        const term = f.q.replace(/[%_,]/g, "");
        q = q.or(
          `full_name.ilike.%${term}%,company.ilike.%${term}%,designation.ilike.%${term}%`,
        );
      }
      if (f.role) q = q.eq("role", f.role);
      if (f.campuses.length > 0) q = q.in("iit_campus", f.campuses);
      if (f.yearMin > YEAR_MIN) q = q.gte("graduation_year", f.yearMin);
      if (f.yearMax < YEAR_MAX) q = q.lte("graduation_year", f.yearMax);
      if (f.interests.length > 0) q = q.overlaps("interests", f.interests);
      if (f.availableOnly)
        q = q.or("available_for_meetings.eq.true,office_hours_enabled.eq.true");

      const { data, count } = await q;
      return {
        rows: (data as AttendeeRow[] | null) ?? [],
        total: count ?? null,
      };
    },
    [supabase],
  );

  // Reload "people" list whenever filters change
  const filterKey = JSON.stringify(filters);
  // The server already rendered the first page. Without this the list
  // re-fetched exactly that page the moment it mounted, throwing away
  // markup that was already on screen — and in any session where the
  // browser client cannot read the table, replacing it with nothing.
  const serverRowsFresh = useRef(initialRows.length > 0);
  useEffect(() => {
    if (tab !== "people") return;
    if (serverRowsFresh.current) {
      serverRowsFresh.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const page = await fetchPage(0, filters);
      if (cancelled) return;
      setRows(page.rows);
      setDone(page.rows.length < PAGE_SIZE);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, fetchPage, tab]);

  // Load connections when first opened
  useEffect(() => {
    if (tab !== "connections" || connections !== null || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: conns } = await supabase
        .from("connections")
        .select("user_a, user_b")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
      const otherIds = ((conns ?? []) as { user_a: string; user_b: string }[])
        .map((c) => (c.user_a === userId ? c.user_b : c.user_a))
        .filter((id): id is string => Boolean(id));
      if (otherIds.length === 0) {
        if (!cancelled) {
          setConnections([]);
          setLoading(false);
        }
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select(
          "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled",
        )
        .in("id", otherIds)
        .order("full_name", { ascending: true, nullsFirst: false });
      if (!cancelled) {
        setConnections((profs as AttendeeRow[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, connections, userId, supabase]);

  // Infinite scroll sentinel for people tab
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (tab !== "people") return;
    const el = sentinelRef.current;
    if (!el || done || loading) return;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoading(true);
        const page = await fetchPage(rows.length, filters);
        setRows((prev) => [...prev, ...page.rows]);
        if (page.rows.length < PAGE_SIZE) setDone(true);
        setLoading(false);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rows.length, done, loading, filters, fetchPage, tab]);

  const visible =
    tab === "people"
      ? rows
      : tab === "foryou"
        ? recommended
        : (connections ?? []);
  const extraCount = activeExtraCount(filters);

  function clearAll() {
    setFilters(emptyFilters());
    setSearchInput("");
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <FilterButton
          active={tab === "foryou"}
          onClick={() => setTab("foryou")}
        >
          For you
        </FilterButton>
        <FilterButton
          active={tab === "people"}
          onClick={() => setTab("people")}
        >
          People
        </FilterButton>
        <FilterButton
          active={tab === "connections"}
          onClick={() => setTab("connections")}
        >
          Connections
        </FilterButton>
      </div>

      {/* Search + filter trigger — People tab only */}
      <div
        className={tab === "people" ? "mb-3 flex items-center gap-2" : "hidden"}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-brand-950" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, company, role…"
            aria-label="Search attendees"
            className="h-11 w-full rounded-lg border border-rule bg-white pl-10 pr-3.5 text-sm font-medium text-brand-950 outline-none placeholder:font-normal placeholder:text-brand-950/70 focus:border-brand-800 focus:ring-2 focus:ring-rule"
          />
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={`Filters${extraCount > 0 ? ` (${extraCount} active)` : ""}`}
              // Same mark as the agenda's: no border, no white ground, and
              // large enough to be the control it is.
              className={cn(
                "relative inline-grid size-11 shrink-0 place-items-center rounded-md text-brand-800 transition-colors hover:bg-paper-deep",
                extraCount > 0 && "text-brand-900",
              )}
            >
              <SlidersHorizontal className="size-[26px]" strokeWidth={1.7} />
              {extraCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-800 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                  {extraCount}
                </span>
              ) : null}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter attendees</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-6 pt-2">
              <FilterFields value={filters} onChange={setFilters} />
              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" onClick={clearAll}>
                  Clear all
                </Button>
                <Button onClick={() => setSheetOpen(false)}>Done</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Role chip row (backend-synced) */}
      {tab === "people" && roles.length > 0 ? (
        <div className="-mx-3 mb-4 overflow-x-auto sm:-mx-5 lg:-mx-6">
          <div className="flex w-max gap-2 px-3 sm:px-5 lg:px-6">
            <RoleChip
              active={filters.role === null}
              onClick={() => setFilters((f) => ({ ...f, role: null }))}
            >
              All
            </RoleChip>
            {roles.map((r) => (
              <RoleChip
                key={r}
                active={filters.role === r}
                onClick={() =>
                  setFilters((f) => ({ ...f, role: f.role === r ? null : r }))
                }
              >
                {roleLabel(r)}
              </RoleChip>
            ))}
          </div>
        </div>
      ) : null}

      {/* No running count. It sat above the list restating what the list
          shows, and on a directory that fills as people register it mostly
          announced how few there were. Clear stays — it is the only way back
          from a filter that matched nothing. */}
      <div className="mb-2 flex items-baseline justify-end">
        {tab === "people" && (filters.role || extraCount > 0 || filters.q) ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-800 hover:text-brand-900"
          >
            <X className="size-3" />
            Clear
          </button>
        ) : null}
      </div>

      {/* List */}
      {visible.length === 0 && !loading ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="mb-1">
              <EmptyArt
                name={
                  tab === "connections"
                    ? "empty-network"
                    : tab === "foryou"
                      ? canMatch
                        ? "empty-team"
                        : "empty-profile"
                      : "empty-search"
                }
              />
            </EmptyMedia>
            <EmptyTitle>
              {tab === "connections"
                ? "No connections yet"
                : tab === "foryou"
                  ? canMatch
                    ? "No matches yet"
                    : "Tell us what you're after"
                  : "No matches"}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <AttendeeListItem
              key={p.id}
              p={p}
              reasons={
                tab === "foryou" && "matchReasons" in p
                  ? (p as RecommendedRow).matchReasons
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      {tab === "people" && !done ? (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-6"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-brand-800/50" />
          ) : null}
        </div>
      ) : tab === "people" && rows.length > 0 ? (
        <div className="py-6 text-center text-[11px] text-brand-950">
          End of list
        </div>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-4 py-2.5 text-[13px] font-normal transition-colors",
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-rule bg-white text-brand-900 hover:bg-paper-deep/40",
      )}
    >
      {children}
    </button>
  );
}

function RoleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-[4px] border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-rule bg-white text-brand-900 hover:border-rule-strong hover:bg-paper-deep",
      )}
    >
      {children}
    </button>
  );
}

function AttendeeListItem({
  p,
  reasons,
}: {
  p: AttendeeRow;
  /** Why this person was recommended. Shown only on the "For you" tab. */
  reasons?: string[];
}) {
  const campus = shortCampus(p.iit_campus);
  const grad = p.graduation_year
    ? `'${String(p.graduation_year).slice(-2)}`
    : "";
  return (
    /*
      The card is a link and so are the social marks inside it, which is an
      <a> inside an <a>: invalid HTML that React resolves by throwing a
      hydration error and rebuilding the list on the client — which is what
      was emptying this tab. The link is now an overlay that fills the card
      behind the content, so both are clickable and neither nests. The
      content ignores the pointer so clicks reach the overlay; the marks take
      it back.
    */
    <li className="group relative rounded-lg border border-rule bg-white p-3 transition-colors hover:bg-paper-deep/30">
      <Link
        href={`/attendees/${p.id}`}
        aria-label={p.full_name ?? "Attendee"}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800"
      />
      <div className="pointer-events-none flex items-start gap-3">
        {/* Square, not a circle: these are portraits at 48px, and a circle
            crops the top of a head off every one of them. */}
        <Avatar className="size-12 shrink-0 rounded-md ring-1 ring-rule">
          {p.photo_url ? (
            <AvatarImage
              src={p.photo_url}
              alt={p.full_name ?? ""}
              className="rounded-md"
            />
          ) : null}
          <AvatarFallback className="rounded-md bg-paper-deep text-[13px] font-semibold text-brand-800">
            {initials(p.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="text-[14px] font-semibold leading-tight text-brand-950">
              {p.full_name ?? "—"}
            </div>
          </div>
          <div className="mt-0.5 truncate text-[12px] text-brand-950">
            {[p.designation, p.company].filter(Boolean).join(" | ") || "—"}
          </div>
          {campus ? (
            <div className="mt-1 text-[11px] font-medium text-brand-950">
              IIT {campus} {grad}
            </div>
          ) : null}
          <SocialActions
            linkedin={p.linkedin_url}
            twitter={p.twitter_url}
            className="pointer-events-auto mt-1.5"
          />
          {reasons && reasons.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {reasons.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-medium text-brand-800 ring-1 ring-rule"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function FilterFields({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
}) {
  function toggleArr(key: "campuses" | "interests", v: string) {
    const cur = value[key];
    onChange({
      ...value,
      [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <FilterGroup label="IIT campus">
        <div className="max-h-44 overflow-y-auto rounded-md border border-rule p-2">
          <ChipGrid>
            {IIT_CAMPUSES.map((c) => (
              <Chip
                key={c}
                active={value.campuses.includes(c)}
                onClick={() => toggleArr("campuses", c)}
              >
                {c.replace("IIT ", "")}
              </Chip>
            ))}
          </ChipGrid>
        </div>
      </FilterGroup>

      <FilterGroup label="Graduation year">
        <div className="text-xs tabular-nums text-brand-900">
          {value.yearMin} – {value.yearMax}
        </div>
        <div className="mt-1.5 flex flex-col gap-2">
          <RangeRow
            sub="From"
            min={YEAR_MIN}
            max={YEAR_MAX}
            value={value.yearMin}
            onChange={(v) =>
              onChange({ ...value, yearMin: Math.min(v, value.yearMax) })
            }
          />
          <RangeRow
            sub="To"
            min={YEAR_MIN}
            max={YEAR_MAX}
            value={value.yearMax}
            onChange={(v) =>
              onChange({ ...value, yearMax: Math.max(v, value.yearMin) })
            }
          />
        </div>
      </FilterGroup>

      <FilterGroup label="Interests">
        <div className="max-h-44 overflow-y-auto rounded-md border border-rule p-2">
          <ChipGrid>
            {INTERESTS.map((i) => (
              <Chip
                key={i}
                active={value.interests.includes(i)}
                onClick={() => toggleArr("interests", i)}
              >
                {i}
              </Chip>
            ))}
          </ChipGrid>
        </div>
      </FilterGroup>

      <label className="flex cursor-pointer items-center justify-between rounded-md border border-rule px-3 py-2.5">
        <span className="text-sm font-medium text-brand-900">
          Available for meetings
        </span>
        <input
          type="checkbox"
          checked={value.availableOnly}
          onChange={(e) =>
            onChange({ ...value, availableOnly: e.target.checked })
          }
          className="size-4 accent-brand-800"
        />
      </label>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 eyebrow text-brand-800">{label}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[4px] border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-rule bg-white text-brand-900 hover:bg-paper-deep",
      )}
    >
      {children}
    </button>
  );
}

function RangeRow({
  sub,
  min,
  max,
  value,
  onChange,
}: {
  sub: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-0.5 eyebrow flex items-center justify-between text-brand-950">
        <span>{sub}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-800"
      />
    </div>
  );
}
