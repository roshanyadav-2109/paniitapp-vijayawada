"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import { LinkedInIcon, XIcon } from "@/components/features/social-icons";
import { createClient } from "@/lib/supabase/client";
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
  EmptyDescription,
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

type SubTab = "people" | "connections";

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

export function NetworkingClient({
  initialRows,
  roles,
  userId,
}: {
  initialRows: AttendeeRow[];
  roles: string[];
  userId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<SubTab>("people");
  const [rows, setRows] = useState<AttendeeRow[]>(initialRows);
  const [connections, setConnections] = useState<AttendeeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialRows.length < PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  // Total matching the current filter — separate from rows.length, which is
  // only the number paginated into view so far. Null while it's unknown.
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Debounce search input into filters.q
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, q: searchInput.trim() })),
      300
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (
      offset: number,
      f: Filters
    ): Promise<{ rows: AttendeeRow[]; total: number | null }> => {
      // Ask Postgres for the exact total alongside the rows so the count we
      // show reflects everyone matching the filter — not just the page that's
      // been paginated into view.
      let q = supabase
        .from("profiles")
        .select(
          "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled",
          { count: "exact" }
        )
        .order("full_name", { ascending: true, nullsFirst: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (f.q) {
        const term = f.q.replace(/[%_,]/g, "");
        q = q.or(
          `full_name.ilike.%${term}%,company.ilike.%${term}%,designation.ilike.%${term}%`
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
    [supabase]
  );

  // Reload "people" list whenever filters change
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (tab !== "people") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const page = await fetchPage(0, filters);
      if (cancelled) return;
      setRows(page.rows);
      setTotalCount(page.total);
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
          "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled"
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
        setTotalCount(page.total);
        if (page.rows.length < PAGE_SIZE) setDone(true);
        setLoading(false);
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rows.length, done, loading, filters, fetchPage, tab]);

  const visible = tab === "people" ? rows : connections ?? [];
  const extraCount = activeExtraCount(filters);

  function clearAll() {
    setFilters(emptyFilters());
    setSearchInput("");
  }

  return (
    <div>
      {/* Sub-tabs — two separate buttons */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <FilterButton active={tab === "people"} onClick={() => setTab("people")}>
          People
        </FilterButton>
        <FilterButton
          active={tab === "connections"}
          onClick={() => setTab("connections")}
        >
          Connections
        </FilterButton>
      </div>

      {/* Search + filter trigger */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-brand-800/55" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, company, role…"
            aria-label="Search attendees"
            className="h-11 w-full rounded-lg border border-brand-100 bg-white pl-10 pr-3.5 text-sm font-medium text-brand-950 outline-none placeholder:font-normal placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={`Filters${extraCount > 0 ? ` (${extraCount} active)` : ""}`}
              className={cn(
                "relative inline-grid size-11 shrink-0 place-items-center rounded-lg border border-brand-100 bg-white text-brand-800 transition-colors hover:bg-brand-50",
                extraCount > 0 && "border-brand-800 text-brand-900"
              )}
            >
              <SlidersHorizontal className="size-[18px]" strokeWidth={1.8} />
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
        <div className="-mx-4 mb-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="flex w-max gap-2 px-4 sm:px-6 lg:px-8">
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

      {/* Count — for the People tab we show the full filter total (which can
          be much larger than visible.length while the user is still scrolling
          to load more pages). Connections tab loads everyone up front, so
          visible.length is already the truth. */}
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-medium text-brand-800/75">
          {(() => {
            if (loading && visible.length === 0) return "Searching…";
            const count =
              tab === "people"
                ? totalCount ?? visible.length
                : visible.length;
            return `${count.toLocaleString()} ${count === 1 ? "person" : "people"}`;
          })()}
        </p>
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
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>
              {tab === "connections" ? "No connections yet" : "No matches"}
            </EmptyTitle>
            <EmptyDescription>
              {tab === "connections"
                ? "Scan another attendee's QR badge to connect."
                : "Try a different search or clear filters."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <AttendeeListItem key={p.id} p={p} />
          ))}
        </ul>
      )}

      {tab === "people" && !done ? (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-brand-800/50" />
          ) : null}
        </div>
      ) : tab === "people" && rows.length > 0 ? (
        <div className="py-6 text-center text-[11px] text-brand-800/50">
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
        "rounded-lg border px-4 py-2.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
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
          : "border-brand-100 bg-white text-brand-900 hover:border-brand-200 hover:bg-brand-50"
      )}
    >
      {children}
    </button>
  );
}

function AttendeeListItem({ p }: { p: AttendeeRow }) {
  const campus = shortCampus(p.iit_campus);
  const grad = p.graduation_year ? `'${String(p.graduation_year).slice(-2)}` : "";
  return (
    <li>
      <Link
        href={`/attendees/${p.id}`}
        className="group flex items-start gap-3 rounded-lg border border-brand-100 bg-white p-3 transition-colors hover:bg-brand-50/30"
      >
        <Avatar className="size-12 shrink-0 ring-1 ring-brand-100">
          {p.photo_url ? (
            <AvatarImage src={p.photo_url} alt={p.full_name ?? ""} />
          ) : null}
          <AvatarFallback className="bg-brand-50 text-[13px] font-semibold text-brand-800">
            {initials(p.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="text-[14px] font-semibold leading-tight text-brand-950">
              {p.full_name ?? "—"}
            </div>
            {p.role ? (
              <span className="shrink-0 rounded-[4px] border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800">
                {roleLabel(p.role)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-brand-900/75">
            {[p.designation, p.company].filter(Boolean).join(" · ") || "—"}
          </div>
          <div className="mt-1 flex items-center gap-3">
            {campus ? (
              <span className="text-[11px] font-medium text-brand-800/70">
                IIT {campus} {grad}
              </span>
            ) : null}
            <SocialIcons p={p} />
          </div>
        </div>
      </Link>
    </li>
  );
}

function SocialIcons({ p }: { p: AttendeeRow }) {
  const items: { href: string; label: string; icon: React.ReactNode }[] = [];
  if (p.linkedin_url) {
    items.push({
      href: p.linkedin_url,
      label: "LinkedIn",
      icon: <LinkedInIcon className="size-[16px]" />,
    });
  }
  if (p.twitter_url) {
    items.push({
      href: p.twitter_url,
      label: "Twitter / X",
      icon: <XIcon className="size-[16px]" />,
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2.5">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex transition-opacity hover:opacity-75"
        >
          {it.icon}
        </a>
      ))}
    </div>
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
        <div className="max-h-44 overflow-y-auto rounded-md border border-brand-100 p-2">
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
        <div className="max-h-44 overflow-y-auto rounded-md border border-brand-100 p-2">
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

      <label className="flex cursor-pointer items-center justify-between rounded-md border border-brand-100 px-3 py-2.5">
        <span className="text-sm font-medium text-brand-900">
          Available for meetings
        </span>
        <input
          type="checkbox"
          checked={value.availableOnly}
          onChange={(e) => onChange({ ...value, availableOnly: e.target.checked })}
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
        {label}
      </div>
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
          : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50"
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
      <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-brand-800/65">
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
