import { CalendarOff } from "@/components/icons";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  SessionCard,
  sessionInterestPool,
  sessionVenueName,
  type SessionCardData,
} from "@/components/features/session-card";
import {
  PageWithFilters,
  FiltersCard,
} from "@/components/features/page-with-filters";
import { AgendaFilters } from "./agenda-filters";
import { AgendaRealtime } from "@/components/features/agenda-realtime";
import { SUMMIT_TZ } from "@/lib/constants";
import { EVENT_DATE_TEXT, EVENT_ID, EVENT_VENUE } from "@/lib/event-config";
import Link from "next/link";

export const dynamic = "force-dynamic";

function hourKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "00:00";
  return formatInTimeZone(date, SUMMIT_TZ, "HH:00");
}

function hourLabel(key: string): string {
  const [h] = key.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ venue?: string; mine?: string; recommended?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const venue = sp.venue ?? "all";
  const mineOnly = sp.mine === "1";
  const recommendedOnly = sp.recommended === "1";

  let sessions: SessionCardData[] = [];
  let bookmarkSet = new Set<string>();
  let userInterests: string[] = [];
  let errored = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const withInterests = await supabase
      .from("sessions")
      .select(
        "id, title, description, track, venue_id, start_at, end_at, is_featured, capacity, current_checkins, venues(id, name, floor), interests"
      )
      .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true });
    if (withInterests.error) {
      // sessions.interests may not exist if migration 0007 hasn't run yet.
      const fallback = await supabase
        .from("sessions")
        .select(
          "id, title, description, track, venue_id, start_at, end_at, is_featured, capacity, current_checkins, venues(id, name, floor)"
        )
        .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true });
      if (fallback.error) errored = true;
      sessions = (fallback.data as unknown as SessionCardData[] | null) ?? [];
    } else {
      sessions = (withInterests.data as unknown as SessionCardData[] | null) ?? [];
    }

    if (user) {
      const [bmRes, profRes] = await Promise.all([
        supabase
          .from("session_bookmarks")
          .select("session_id")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      bookmarkSet = new Set(
        (bmRes.data as { session_id: string }[] | null)?.map((b) => b.session_id) ?? []
      );
      userInterests =
        ((profRes.data as { interests: string[] | null } | null)?.interests) ?? [];
    }
  } catch {
    errored = true;
  }

  const userInterestSet = new Set(userInterests);
  const isRecommended = (s: SessionCardData): boolean => {
    if (userInterestSet.size === 0) return false;
    const pool = sessionInterestPool(s);
    return pool.some((i) => userInterestSet.has(i));
  };

  const filtered = sessions.filter((s) => {
    if (venue !== "all" && s.venue_id !== venue) return false;
    if (mineOnly && !bookmarkSet.has(s.id)) return false;
    if (recommendedOnly && !isRecommended(s)) return false;
    return true;
  });

  const venueOptions = Array.from(
    sessions.reduce<Map<string, { id: string; label: string }>>(
      (acc, s) => {
        if (!s.venue_id) return acc;
        const label = sessionVenueName(s.venues);
        if (!label) return acc;
        acc.set(s.venue_id, { id: s.venue_id, label });
        return acc;
      },
      new Map()
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  const grouped = filtered.reduce<Map<string, SessionCardData[]>>((acc, s) => {
    const k = hourKey(s.start_at);
    if (!acc.has(k)) acc.set(k, []);
    acc.get(k)!.push(s);
    return acc;
  }, new Map());
  const hourKeys = Array.from(grouped.keys()).sort();

  return (
    <PageWithFilters
      header={
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900 lg:text-3xl">
            Agenda
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {EVENT_DATE_TEXT} · {EVENT_VENUE} · all times IST
          </p>
        </div>
      }
      filters={
        <FiltersCard>
          <AgendaFilters venues={venueOptions} />
        </FiltersCard>
      }
    >
      {userInterests.length === 0 ? (
        <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
          <p className="text-[12px] leading-5 text-brand-900">
            Pick your areas of interest in{" "}
            <Link
              href="/me/edit"
              className="font-semibold text-brand-800 underline-offset-2 hover:underline"
            >
              your profile
            </Link>{" "}
            to highlight matching sessions and people across the summit.
          </p>
        </div>
      ) : null}

      {hourKeys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>
              {recommendedOnly
                ? "Nothing recommended yet"
                : mineOnly
                ? "Nothing bookmarked yet"
                : errored
                ? "Can't load schedule"
                : "No sessions"}
            </EmptyTitle>
            <EmptyDescription>
              {recommendedOnly
                ? "Add more interests in your profile to surface matching sessions."
                : mineOnly
                ? "Bookmark sessions to build your personal agenda."
                : errored
                ? "We can't reach the schedule right now."
                : "Sessions will appear here once organizers publish them."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {hourKeys.map((k) => (
            <section key={k} id={`h-${k.replace(":", "")}`}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider tabular-nums text-slate-500">
                {hourLabel(k)}
              </div>
              <ul className="flex flex-col gap-3">
                {grouped.get(k)!.map((s) => (
                  <li key={s.id}>
                    <SessionCard
                      session={s}
                      bookmarked={bookmarkSet.has(s.id)}
                      userInterests={userInterests}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AgendaRealtime />
    </PageWithFilters>
  );
}
