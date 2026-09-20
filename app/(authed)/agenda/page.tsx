import { EmptyArt } from "@/components/features/empty-art";
import { LoginCta } from "@/components/features/login-cta";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
import { createClient } from "@/lib/supabase/server";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SessionCard,
  sessionInterestPool,
  sessionVenueName,
  type SessionCardData,
} from "@/components/features/session-card";
import { PageWithFilters } from "@/components/features/page-with-filters";
import { AgendaFilters } from "./agenda-filters";
import { PromoCarousel } from "@/components/features/promo-carousel";
import { AgendaRealtime } from "@/components/features/agenda-realtime";
import { getPublicSessions } from "@/lib/public-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** How much of the day a signed-out visitor sees in full. */
const GUEST_PREVIEW = 3;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{
    venue?: string;
    mine?: string;
    recommended?: string;
  }>;
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

    // The programme is the same for everybody, so it is read once and
    // shared rather than fetched per visitor (lib/public-data.ts). What
    // follows it — bookmarks and interests — is this visitor's alone and
    // stays on the cookie-carrying client.
    sessions = (await getPublicSessions()) as unknown as SessionCardData[];

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
        (bmRes.data as { session_id: string }[] | null)?.map(
          (b) => b.session_id,
        ) ?? [],
      );
      userInterests =
        (profRes.data as { interests: string[] | null } | null)?.interests ??
        [];
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

  // Empty-state preview: DEV_EMPTY=1 blanks the page without touching a
  // row in the database. It has to happen before the filtering below,
  // which is what the page actually renders.
  sessions = emptied(sessions);
  userInterests = emptied(userInterests);

  const signedIn = await isSignedIn();

  const filtered = sessions.filter((s) => {
    if (venue !== "all" && s.venue_id !== venue) return false;
    if (mineOnly && !bookmarkSet.has(s.id)) return false;
    if (recommendedOnly && !isRecommended(s)) return false;
    return true;
  });

  const venueOptions = Array.from(
    sessions
      .reduce<Map<string, { id: string; label: string }>>((acc, s) => {
        if (!s.venue_id) return acc;
        const label = sessionVenueName(s.venues);
        if (!label) return acc;
        acc.set(s.venue_id, { id: s.venue_id, label });
        return acc;
      }, new Map())
      .values(),
  ).sort((a, b) => a.label.localeCompare(b.label));


  return (
    /* No page title and no date-and-venue line. The tab is called Agenda in
       the bar at the bottom of the screen, the summit is one day in one
       building, and the first thing under the heading was a time column
       already. */
    /* The banners sit in the header slot, above My Agenda and the filter
       mark, rather than between the controls and the programme. */
    <PageWithFilters
      header={<PromoCarousel />}
      filters={<AgendaFilters venues={venueOptions} />}
    >
      {userInterests.length === 0 ? (
        /* In the same green as the Recommended bar on a card, because that
           green is exactly what this offer buys you. A line of grey text
           above a list of cards is the easiest thing on a page to skip. */
        <p className="mb-4 rounded-md bg-emerald-700 px-3 py-2 text-[12.5px] leading-5 text-white">
          <Link href="/me/edit" className="underline underline-offset-2">
            Add your interests
          </Link>{" "}
          to see recommended sessions.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="mb-1">
              <EmptyArt
                name={
                  errored
                    ? "error-generic"
                    : mineOnly
                      ? "empty-bookmark"
                      : recommendedOnly
                        ? "empty-bookmark"
                        : "empty-calendar"
                }
              />
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
          </EmptyHeader>
        </Empty>
      ) : (
        /* One list, no hour headings. Each heading repeated the time of the
           card directly beneath it, and nothing in the app linked to the
           anchors they carried — the card's own time column is what makes
           the day scannable now. */
        <>
          <ul className="flex flex-col gap-2">
            {(signedIn ? filtered : filtered.slice(0, GUEST_PREVIEW)).map(
              (s) => (
                <li key={s.id}>
                  <SessionCard
                    session={s}
                    bookmarked={bookmarkSet.has(s.id)}
                    userInterests={userInterests}
                  />
                </li>
              )
            )}
          </ul>

          {/* A guest sees the first few sessions in full, then the ask, then
              the rest of the day behind a blur: enough to know the programme
              is real and worth signing in for, without printing it. The
              blurred half is inert and hidden from screen readers — it is a
              picture of a list, not a list. */}
          {!signedIn && filtered.length > GUEST_PREVIEW ? (
            <>
              <LoginCta
                next="/agenda"
                className="mt-4"
              />
              <div
                aria-hidden
                className="pointer-events-none mt-4 select-none blur-[5px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
              >
                <ul className="flex flex-col gap-2">
                  {filtered.slice(GUEST_PREVIEW, GUEST_PREVIEW + 4).map((s) => (
                    <li key={s.id}>
                      <SessionCard
                        session={s}
                        bookmarked={false}
                        userInterests={userInterests}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </>
      )}

      <AgendaRealtime />
    </PageWithFilters>
  );
}
