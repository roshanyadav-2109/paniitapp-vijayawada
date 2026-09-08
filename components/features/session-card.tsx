import Link from "next/link";
import { MapPin } from "lucide-react";
import { BookmarkButton } from "./bookmark-button";
import { TRACK_LABELS, TRACK_TO_INTERESTS } from "@/lib/constants";
import { rangeIST } from "@/lib/date";

export interface SessionCardData {
  id: string;
  title: string;
  description: string | null;
  track: string | null;
  venue_id?: string | null;
  start_at: string;
  end_at: string;
  is_featured: boolean | null;
  capacity: number | null;
  current_checkins: number | null;
  venues:
    | { id?: string | null; name: string | null; floor?: string | number | null }
    | { id?: string | null; name: string | null; floor?: string | number | null }[]
    | null;
  // Optional per-session topic tags (column added in migration 0007).
  // When present they drive the Recommended match directly; otherwise we
  // fall back to TRACK_TO_INTERESTS so the older sessions still light up.
  interests?: string[] | null;
}

export function sessionVenueName(
  venues: SessionCardData["venues"]
): string | null {
  const venue = Array.isArray(venues) ? venues[0] : venues;
  return venue?.name ?? null;
}

export function sessionVenueFloor(
  venues: SessionCardData["venues"]
): string | null {
  const venue = Array.isArray(venues) ? venues[0] : venues;
  const floor = venue?.floor;
  if (floor == null) return null;
  if (typeof floor === "number") return `Floor ${floor}`;
  return floor.trim() || null;
}

const TRACK_COLORS: Record<string, string> = {
  ai: "#7C3AED",
  deeptech: "#06B6D4",
  policy: "#10B981",
  investor: "#1B1464",
  workshop: "#EC4899",
  founders: "#F97316",
  climate: "#22C55E",
  fintech: "#3B82F6",
  keynote: "#1B1464",
  general: "#64748B",
};

export function trackColor(track: string | null | undefined): string {
  if (!track) return "#64748B";
  return TRACK_COLORS[track] ?? "#64748B";
}

function capacityState(used: number, total: number) {
  const ratio = total > 0 ? used / total : 0;
  if (ratio >= 0.85) return { fill: "bg-iit-500", label: "Almost full" };
  if (ratio >= 0.6) return { fill: "bg-amber-500", label: "Filling up" };
  return { fill: "bg-emerald-500", label: "Seats available" };
}

export function sessionInterestPool(
  session: Pick<SessionCardData, "track" | "interests">
): string[] {
  if (session.interests && session.interests.length > 0) return session.interests;
  const track = session.track ?? "general";
  return [...(TRACK_TO_INTERESTS[track] ?? [])];
}

export function matchedInterestsForSession(
  session: Pick<SessionCardData, "track" | "interests">,
  userInterests: string[] | null | undefined
): string[] {
  if (!userInterests || userInterests.length === 0) return [];
  const pool = sessionInterestPool(session);
  if (pool.length === 0) return [];
  const userSet = new Set(userInterests);
  return pool.filter((i) => userSet.has(i));
}

export function SessionCard({
  session,
  bookmarked,
  userInterests,
}: {
  session: SessionCardData;
  bookmarked: boolean;
  userInterests?: string[] | null;
}) {
  const capacity = session.capacity ?? 0;
  const used = session.current_checkins ?? 0;
  const showCapacity = capacity > 0;
  const cap = showCapacity ? capacityState(used, capacity) : null;
  const pct = showCapacity ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const matches = matchedInterestsForSession(session, userInterests);
  const venueName = sessionVenueName(session.venues);
  const venueFloor = sessionVenueFloor(session.venues);
  const track = session.track ?? "general";

  return (
    <Link
      href={`/agenda/${session.id}`}
      className="relative block overflow-hidden rounded-lg border border-brand-100 bg-white p-4 transition-colors hover:bg-brand-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-brand-950">
              {rangeIST(session.start_at, session.end_at)}
            </span>
            {session.is_featured ? (
              <span className="rounded-[4px] border border-iit-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-iit-600">
                Featured
              </span>
            ) : null}
            {matches.length > 0 ? (
              <span className="rounded-[4px] border border-emerald-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Recommended
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-base font-semibold leading-snug text-brand-950">
            {session.title}
          </h3>
          {session.description ? (
            <p className="mt-1 text-xs leading-5 text-brand-900/65 line-clamp-2">
              {session.description}
            </p>
          ) : null}
        </div>
        <BookmarkButton sessionId={session.id} initial={bookmarked} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-900/75">
        {venueName ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-brand-800/65" />
            {venueName}
            {venueFloor ? <span className="text-brand-900/55">({venueFloor})</span> : null}
          </span>
        ) : null}
        <span className="rounded-[4px] border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
          {TRACK_LABELS[track] ?? track}
        </span>
        {matches.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {matches.slice(0, 3).map((m) => (
              <span
                key={m}
                className="rounded-[4px] bg-brand-800/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-800"
              >
                {m}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {showCapacity && cap ? (
        <div className="mt-3">
          <div className="h-1 overflow-hidden rounded-full bg-brand-100">
            <div
              className={`h-full ${cap.fill} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-brand-800/70">
            <span>{cap.label}</span>
            <span>
              {used.toLocaleString()} / {capacity.toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}
    </Link>
  );
}
