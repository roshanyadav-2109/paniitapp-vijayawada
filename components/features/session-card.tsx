import Link from "next/link";
import { MapPin } from "@/components/icons";
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
      className="relative block overflow-hidden rounded-lg border border-rule bg-white py-4 pl-5 pr-4 transition-colors hover:bg-paper-deep/40"
    >
      {/*
        Track as a keyline down the left edge rather than a coloured pill in
        the metadata row. Same information, no extra object competing with the
        title — and it gives a scanned list of sessions a colour rhythm at the
        margin, which a row of pills never does.
      */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: trackColor(track) }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-xs font-medium tabular-nums text-brand-900/70">
              {rangeIST(session.start_at, session.end_at)}
            </span>
            {/*
              One badge, not three. The card used to be able to show Featured,
              Recommended, a track pill and up to three interest pills at once
              — seven objects around a title, which reads as a dashboard row
              rather than a thing happening in a room. Featured outranks
              Recommended because it is editorial, not personalised.
            */}
            {session.is_featured ? (
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-iit-600">
                Featured
              </span>
            ) : matches.length > 0 ? (
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-emerald-700">
                Recommended
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 font-display text-[17px] font-semibold leading-snug text-brand-950">
            {session.title}
          </h3>
          {session.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-brand-900/60">
              {session.description}
            </p>
          ) : null}
        </div>
        <BookmarkButton sessionId={session.id} initial={bookmarked} />
      </div>

      {/* Metadata as one plain line of text, separated by middots — the
          information density of the pill row without seven bordered boxes. */}
      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-brand-900/60">
        <span className="font-medium text-brand-900/75">
          {TRACK_LABELS[track] ?? track}
        </span>
        {venueName ? (
          <>
            <span aria-hidden className="text-brand-900/30">
              &middot;
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-brand-900/40" />
              {venueName}
              {venueFloor ? <span className="text-brand-900/45">({venueFloor})</span> : null}
            </span>
          </>
        ) : null}
        {matches.length > 0 ? (
          <>
            <span aria-hidden className="text-brand-900/30">
              &middot;
            </span>
            <span className="text-brand-900/55">{matches.slice(0, 2).join(", ")}</span>
          </>
        ) : null}
      </p>

      {showCapacity && cap ? (
        <div className="mt-3">
          <div className="h-[3px] overflow-hidden rounded-full bg-rule">
            <div
              className={`h-full ${cap.fill} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-brand-900/55">
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
