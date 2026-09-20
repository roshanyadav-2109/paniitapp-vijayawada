import { createClient } from "@/lib/supabase/server";
import { LoginCta } from "@/components/features/login-cta";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
import { rethrowIfRedirect } from "@/lib/redirect";
import {
  NetworkingClient,
  type AttendeeRow,
  type RecommendedRow,
} from "./networking-client";
import { EVENT_ID } from "@/lib/event-config";
import { canMatch, rankMatches, type MatchProfile } from "@/lib/match";

export const dynamic = "force-dynamic";

// Fields the directory list needs.
const LIST_FIELDS =
  "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled";

// Ranking is done in this request rather than in SQL: the scoring rules are
// product judgement (see lib/match.ts) and change more often than the schema.
// The pool is capped so a full house stays a single bounded query.
const MATCH_POOL = 500;

type PoolRow = AttendeeRow & { asks: string[] | null; offers: string[] | null };

export default async function AttendeesPage() {
  let rows: AttendeeRow[] = [];
  let roles: string[] = [];
  let userId: string | null = null;
  let recommended: RecommendedRow[] = [];
  let viewerCanMatch = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    const [{ data: people }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        // profiles is global across summit editions — the inner join to
        // event_participants is what limits the directory to this summit.
        .select(`${LIST_FIELDS}, event_participants!inner(event_id)`)
        .eq("event_participants.event_id", EVENT_ID)
        .order("full_name", { ascending: true, nullsFirst: false })
        .range(0, 49),
      supabase
        .from("profiles")
        .select("role, event_participants!inner(event_id)")
        .eq("event_participants.event_id", EVENT_ID)
        .not("role", "is", null)
        .order("role", { ascending: true }),
    ]);
    rows = (people as AttendeeRow[] | null) ?? [];
    const seen = new Set<string>();
    for (const r of roleRows ?? []) {
      const v = (r as { role: string | null }).role;
      if (v && !seen.has(v)) seen.add(v);
    }
    roles = Array.from(seen);

    if (user) {
      const [{ data: me }, { data: pool }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, iit_campus, interests, asks, offers, available_for_meetings, office_hours_enabled")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(`${LIST_FIELDS}, asks, offers, event_participants!inner(event_id)`)
          .eq("event_participants.event_id", EVENT_ID)
          .neq("id", user.id)
          .range(0, MATCH_POOL - 1),
      ]);

      const viewer = me as MatchProfile | null;
      if (viewer && canMatch(viewer)) {
        viewerCanMatch = true;
        const candidates = (pool as PoolRow[] | null) ?? [];
        const byId = new Map(candidates.map((c) => [c.id, c]));
        const ranked: RecommendedRow[] = [];
        for (const m of rankMatches(viewer, candidates as MatchProfile[])) {
          const row = byId.get(m.profile.id);
          if (!row) continue;
          // asks/offers are only needed for scoring, which already happened —
          // don't ship them to the client.
          const { asks: _asks, offers: _offers, ...listRow } = row;
          void _asks;
          void _offers;
          ranked.push({ ...listRow, matchReasons: m.reasons });
        }
        recommended = ranked;
      } else if (viewer) {
        // Signed in but nothing to match on — the tab explains how to fix that.
        viewerCanMatch = false;
      }
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }


  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  rows = emptied(rows);
  recommended = emptied(recommended);

  const signedIn = await isSignedIn();

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 lg:pt-8">
      {!signedIn ? (
        <LoginCta
          next="/attendees"
          className="mb-4"
        />
      ) : null}
      <NetworkingClient
        initialRows={rows}
        roles={roles}
        userId={userId}
        recommended={recommended}
        canMatch={viewerCanMatch}
      />
    </div>
  );
}
