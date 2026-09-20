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
    | {
        id?: string | null;
        name: string | null;
        floor?: string | number | null;
      }
    | {
        id?: string | null;
        name: string | null;
        floor?: string | number | null;
      }[]
    | null;
  // Optional per-session topic tags (column added in migration 0007).
  // When present they drive the Recommended match directly; otherwise we
  // fall back to TRACK_TO_INTERESTS so the older sessions still light up.
  interests?: string[] | null;
}

export function sessionVenueName(
  venues: SessionCardData["venues"],
): string | null {
  const venue = Array.isArray(venues) ? venues[0] : venues;
  return venue?.name ?? null;
}

export function sessionVenueFloor(
  venues: SessionCardData["venues"],
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
  session: Pick<SessionCardData, "track" | "interests">,
): string[] {
  if (session.interests && session.interests.length > 0)
    return session.interests;
  const track = session.track ?? "general";
  return [...(TRACK_TO_INTERESTS[track] ?? [])];
}

export function matchedInterestsForSession(
  session: Pick<SessionCardData, "track" | "interests">,
  userInterests: string[] | null | undefined,
): string[] {
  if (!userInterests || userInterests.length === 0) return [];
  const pool = sessionInterestPool(session);
  if (pool.length === 0) return [];
  const userSet = new Set(userInterests);
  return pool.filter((i) => userSet.has(i));
}

/**
 * The sector a session belongs to, for the "Sector:" line on the card.
 *
 * `interests` is the real answer where it exists — those are the sector
 * tags ("Defense Tech", "AI & Machine Learning"), and 36 of the 58 sessions
 * carry them. `track` is the fallback, but only for the tracks that name a
 * field: 24 sessions are tagged `general` and 11 `keynote`, and "Sector:
 * Keynote" is not a sector, it is a format. Those get no line at all, which
 * is right for a registration desk or a lunch break.
 */
const FORMAT_TRACKS = new Set(["general", "keynote", "workshop"]);

export function sessionSector(
  session: Pick<SessionCardData, "track" | "interests">,
): string | null {
  const first = session.interests?.[0]?.trim();
  if (first) return first;
  const track = session.track ?? "general";
  if (FORMAT_TRACKS.has(track)) return null;
  return TRACK_LABELS[track] ?? null;
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
  // Before the doors open every session reads "Seats available 0 / 900",
  // which is a progress bar for a thing that has not started. It appears
  // once people actually check in.
  const showCapacity = capacity > 0 && used > 0;
  const cap = showCapacity ? capacityState(used, capacity) : null;
  const pct = showCapacity
    ? Math.min(100, Math.round((used / capacity) * 100))
    : 0;
  const matches = matchedInterestsForSession(session, userInterests);
  const venueName = sessionVenueName(session.venues);
  const venueFloor = sessionVenueFloor(session.venues);
  const sector = sessionSector(session);

  return (
    <Link
      href={`/agenda/${session.id}`}
      className="block overflow-hidden rounded-lg border border-rule bg-white transition-colors hover:bg-paper-deep/40"
    >
      {/*
        Title, then what kind of session it is, then when and where — in that
        order, each on its own line. Everything here is set in the brand
        near-black rather than in tints of it: on a card carrying four short
        lines, greying three of them to rank them just makes three of them
        harder to read.
      */}
      <div className="flex items-start justify-between gap-3 py-3.5 pl-4 pr-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15.5px] font-semibold leading-snug text-brand-950">
            {session.title}
          </h3>

          {sector ? (
            <p className="mt-1 text-[13px] font-medium leading-snug text-brand-950">
              Sector: {sector}
            </p>
          ) : null}

          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] leading-snug text-brand-950">
            <span className="tabular-nums">
              {rangeIST(session.start_at, session.end_at)}
            </span>
            {venueName ? (
              <>
                {/* No separator between the time and the room. At this
                    width the room always wraps to its own line, so the
                    middot ended up leading a line instead of dividing
                    two — the pin already marks where the room starts. */}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-brand-950/50" />
                  {venueName}
                  {venueFloor ? <span>({venueFloor})</span> : null}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <BookmarkButton sessionId={session.id} initial={bookmarked} />
      </div>

      {/*
        One bar, and only where there is something to say: Featured in the
        IIT red, Recommended in green, the word alone — set as a word, at
        normal weight, not in spaced capitals. The track is not in
        it — it is under the title, where it belongs, and repeating it here
        made the bar a second metadata row rather than a flag.

        Featured outranks Recommended because it is editorial rather than
        personalised. No hairline above either: a solid block is its own
        edge.
      */}
      {session.is_featured ? (
        <p className="bg-iit-500 px-4 py-1.5 text-[12px] font-normal text-white">
          Featured
        </p>
      ) : matches.length > 0 ? (
        <p className="bg-emerald-700 px-4 py-1.5 text-[12px] font-normal text-white">
          Recommended
        </p>
      ) : null}

      {showCapacity && cap ? (
        <div className="px-4 pb-3.5">
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
