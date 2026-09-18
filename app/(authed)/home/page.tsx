import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Compass,
} from "@/components/icons";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { SUMMIT_TZ } from "@/lib/constants";
import {
  EVENT_ATTENDEE_COUNT,
  EVENT_DATE_LABEL,
  EVENT_MAPS_URL,
  EVENT_NAME,
  EVENT_ID,
  EVENT_SECTORS,
  EVENT_SHORT_NAME,
  EVENT_SOCIALS,
  type EventSocial,
  EVENT_STORAGE_PREFIX,
  EVENT_TAGLINE,
  EVENT_VENUE,
} from "@/lib/event-config";
import { HeroCarousel } from "./hero-carousel";
import { SponsorsBoard, type SponsorTier } from "./sponsors-marquee";
import { QuickActions } from "./quick-actions";
import { KeyParticipantsStrip } from "./key-participants-strip";
import { TileGrid } from "@/components/features/tile-grid";

const LOGO_BUCKET = "LOGOS";
// Folder name in storage = visible tier heading. Order = display order.
const SPONSOR_TIER_FOLDERS = [
  "Title Sponsor",
  "Gold Sponsor",
  "Silver Sponsor",
  "Bronze Sponsor",
] as const;

export const dynamic = "force-dynamic";

interface CalendarItem {
  kind: "meeting" | "session";
  start: string;
  end: string;
  title: string;
  presenter: string | null;
  href: string;
}

const SUMMIT_VENUE = EVENT_VENUE;
const SUMMIT_DATE_LABEL = EVENT_DATE_LABEL;
const SUMMIT_MAPS_URL = EVENT_MAPS_URL;

// Artwork only — the hrefs come from EVENT_SOCIALS so there is one list of
// accounts in the app rather than one per screen. Two of the URLs this row
// used to hard-code were dead; see the note on EVENT_SOCIALS.
const SOCIAL_LOGOS: Record<EventSocial["key"], React.ReactNode> = {
  linkedin: <LinkedInLogo />,
  instagram: <InstagramLogo />,
  x: <XLogo />,
  youtube: <YouTubeLogo />,
  facebook: <FacebookLogo />,
};

interface KeyPerson {
  id: string;
  full_name: string;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
}

export default async function HomePage() {
  let calendar: CalendarItem[] = [];
  let sponsorTiers: SponsorTier[] = [];
  let role: string | null = null;
  let keyPeople: KeyPerson[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (me?.role as string | null) ?? null;
    }

    const { data: kp } = await supabase
      .from("key_participants")
      .select("id, full_name, designation, company, photo_url")
      .eq("event_id", EVENT_ID)
      .eq("is_published", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });
    keyPeople = (kp as KeyPerson[] | null) ?? [];

    const sponsorListings = await Promise.all(
      SPONSOR_TIER_FOLDERS.map((folder) =>
        supabase.storage
          .from(LOGO_BUCKET)
          .list(`${EVENT_STORAGE_PREFIX}/${folder}`, {
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          })
          .then((res) => ({ folder, data: res.data ?? [] }))
      )
    );
    sponsorTiers = sponsorListings
      .map(({ folder, data }) => {
        const logos = data
          .filter(
            (item) =>
              !!item.name &&
              !item.name.startsWith(".") &&
              /\.(png|jpe?g|webp|svg|avif|gif)$/i.test(item.name)
          )
          .map((item) => {
            const { data: pub } = supabase.storage
              .from(LOGO_BUCKET)
              .getPublicUrl(`${EVENT_STORAGE_PREFIX}/${folder}/${item.name}`);
            return pub.publicUrl;
          });
        return { name: folder, logos };
      })
      .filter((tier) => tier.logos.length > 0);

    const [meetingsRes, bookmarkRes] = await Promise.all([
      user
        ? supabase
            .from("meetings")
            .select(
              "id, requester_id, invitee_id, accepted_slot, status, requester:requester_id(id, full_name), invitee:invitee_id(id, full_name)"
            )
            .eq("event_id", EVENT_ID)
            .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
            .eq("status", "accepted")
        : Promise.resolve({ data: [] as unknown[] }),
      user
        ? supabase
            .from("session_bookmarks")
            .select(
              "sessions(id, title, start_at, end_at, session_speakers(profiles:speaker_id(full_name)))"
            )
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const acceptedMeetings = (meetingsRes.data ?? []) as Array<{
      id: string;
      requester_id: string;
      invitee_id: string;
      accepted_slot: { start: string; end: string } | null;
      requester: { id: string; full_name: string | null } | null;
      invitee: { id: string; full_name: string | null } | null;
    }>;

    type BookmarkedSession = {
      id: string;
      title: string;
      start_at: string;
      end_at: string;
      session_speakers:
        | Array<{ profiles: { full_name: string | null } | { full_name: string | null }[] | null }>
        | null;
    };
    const bookmarks = ((bookmarkRes.data ?? []) as Array<{
      sessions: BookmarkedSession | null;
    }>)
      .map((r) => r.sessions)
      .filter((s): s is BookmarkedSession => !!s);

    function speakerNames(b: BookmarkedSession): string | null {
      if (!b.session_speakers || b.session_speakers.length === 0) return null;
      const names: string[] = [];
      for (const ss of b.session_speakers) {
        const p = Array.isArray(ss.profiles) ? ss.profiles[0] : ss.profiles;
        const name = p?.full_name?.trim();
        if (name) names.push(name);
      }
      if (names.length === 0) return null;
      if (names.length === 1) return names[0];
      if (names.length === 2) return `${names[0]} · ${names[1]}`;
      return `${names[0]} +${names.length - 1}`;
    }

    calendar = [
      ...acceptedMeetings.flatMap((m) => {
        if (!m.accepted_slot || !user) return [];
        const other = m.requester_id === user.id ? m.invitee : m.requester;
        return [
          {
            kind: "meeting" as const,
            start: m.accepted_slot.start,
            end: m.accepted_slot.end,
            title: "1:1 Meeting",
            presenter: other?.full_name ?? null,
            href: `/meetings/${m.id}`,
          },
        ];
      }),
      ...bookmarks.map((b) => ({
        kind: "session" as const,
        start: b.start_at,
        end: b.end_at,
        title: b.title,
        presenter: speakerNames(b),
        href: `/agenda/${b.id}`,
      })),
    ].sort((a, b) => a.start.localeCompare(b.start));

  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="-mx-4 space-y-9 pb-4 pt-4 sm:-mx-6 lg:mx-auto lg:w-[85vw] lg:max-w-6xl lg:space-y-14 lg:px-0 lg:pt-8">
      {/* Carousel breaks out of the 85vw column on desktop so it spans
          almost full screen with a slim margin on each side. */}
      <div className="px-4 sm:px-6 lg:-mx-[5vw] lg:px-0 xl:-mx-[7vw]">
        <HeroCarousel />
      </div>

      {/*
        Masthead. This was a radial purple-to-navy gradient card — the single
        most generic thing on the page. It is now a flat navy block with a red
        rule across the top and hairlines between the meta rows: a printed
        programme cover, not a hero gradient. Flat also means the tagline
        sits on one solid value instead of drifting across three.
      */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-brand-800">
          <div className="h-[3px] w-full bg-iit-500" aria-hidden />
          <div className="p-5 sm:p-6">
            <p className="eyebrow text-paper/60">
              PAN IIT 2026 · {EVENT_SHORT_NAME}
            </p>
            <h2 className="mt-2 max-w-[22ch] font-display text-[26px] font-semibold leading-[1.15] text-paper sm:text-[30px]">
              {EVENT_TAGLINE}
            </h2>

            <dl className="mt-5 border-t border-paper/15">
              <div className="flex items-start gap-3 border-b border-paper/15 py-2.5">
                <dt className="sr-only">Date</dt>
                <CalendarDays className="mt-[3px] size-4 shrink-0 text-iit-400" strokeWidth={1.6} />
                <dd className="text-[13px] leading-snug text-paper/85">{SUMMIT_DATE_LABEL}</dd>
              </div>
              <div className="flex items-start gap-3 border-b border-paper/15 py-2.5">
                <dt className="sr-only">Venue</dt>
                <MapPin className="mt-[3px] size-4 shrink-0 text-iit-400" strokeWidth={1.6} />
                <dd className="text-[13px] leading-snug text-paper/85">{SUMMIT_VENUE}</dd>
              </div>
            </dl>

            <a
              href={SUMMIT_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-sm border border-paper/35 px-3.5 text-[13px] font-medium text-paper transition-colors hover:border-paper hover:bg-paper hover:text-brand-900"
            >
              <Compass className="size-4" strokeWidth={1.6} />
              View directions
            </a>
          </div>
        </div>
      </section>

      {/* Key guests & speakers */}
      {keyPeople.length > 0 ? (
        <section>
          <div className="px-4 sm:px-6 lg:px-8">
            <SectionHead title="Key guests & speakers" />
          </div>
          <div className="mt-4">
            <KeyParticipantsStrip people={keyPeople} />
          </div>
        </section>
      ) : null}

      {/* Quick actions */}
      <section className="px-4 sm:px-6 lg:px-8">
        <QuickActions role={role} />
      </section>

      {/* Session themes — the eight sectors the summit is organised around. */}
      <section className="px-4 sm:px-6 lg:px-8">
        <SectionHead title="Session themes" meta="8 sectors" />
        <div className="mt-4">
          <TileGrid
            numbered
            href="/agenda"
            items={EVENT_SECTORS.map((x) => ({
              slug: x.slug,
              label: x.label,
              image: x.image,
              caption: x.slot,
              detail: x.blurb,
            }))}
          />
        </div>
      </section>

      {/*
        Today's calendar. Was a white card containing a stack of smaller white
        cards — a box inside a box, with the border doing the work twice. Now
        the section rule separates it from what is above and hairlines separate
        the rows, so the timetable reads as a timetable.
      */}
      <section className="px-4 sm:px-6 lg:px-8">
        <SectionHead
          title="Today’s calendar"
          meta={
            calendar.length > 0
              ? `${calendar.length} item${calendar.length === 1 ? "" : "s"}`
              : undefined
          }
        />
        {calendar.length === 0 ? (
          <p className="mt-4 max-w-prose text-[14px] leading-7 text-brand-900/70">
            Your day is open. Bookmark sessions in Agenda and accept meeting
            requests to fill this in.
          </p>
        ) : (
          <ul className="list-ruled mt-1">
            {calendar.map((e, i) => (
              <li key={`${i}-${e.start}`}>
                <Link
                  href={e.href}
                  className="group flex items-baseline gap-4 py-3.5 transition-colors hover:bg-paper-deep/50"
                >
                  <span className="w-[62px] shrink-0 text-[12px] font-medium tabular-nums text-brand-900/60">
                    {formatInTimeZone(new Date(e.start), SUMMIT_TZ, "h:mm a")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-semibold leading-snug text-brand-950">
                      {e.title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-brand-900/60">
                      {e.kind === "meeting" ? "1:1 meeting" : "Session"}
                      {e.presenter ? <> &middot; {e.presenter}</> : null}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 self-center text-brand-900/35 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* About */}
      <section className="px-4 sm:px-6 lg:px-8">
        <SectionHead title="About the summit" />
        <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.75] text-brand-900/85">
          The {EVENT_NAME} brings together {EVENT_ATTENDEE_COUNT} delegates —
          alumni, founders, investors, and policy makers across 23 IIT campuses
          — for one day on building Andhra Pradesh&rsquo;s deep-tech decade.
        </p>
        <Link
          href="/home/about"
          className="group mt-4 inline-flex items-center gap-1.5 border-b border-brand-800/30 pb-0.5 text-[13px] font-medium text-brand-800 transition-colors hover:border-brand-800"
        >
          Know more
          <ArrowUpRight
            className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.6}
          />
        </Link>
      </section>

      {/* Live stream */}
      <section className="px-4 sm:px-6 lg:px-8">
        <SectionHead title="Live stream" />
        <div className="mt-4 overflow-hidden rounded-lg bg-black">
          <div className="relative aspect-video w-full">
            <iframe
              src="https://www.youtube.com/embed/6CdwG2RUTJ4?autoplay=1&mute=1&playsinline=1&rel=0&si=Nu9IZOYr7ksqYe-L"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute left-0 top-0 h-full w-full"
            />
          </div>
        </div>
      </section>

      {/* Sponsors */}
      {sponsorTiers.length > 0 ? (
        <section className="px-4 sm:px-6 lg:px-8">
          <SponsorsBoard tiers={sponsorTiers} />
        </section>
      ) : null}

      {/* Connect — left-aligned. Centred icon rows are a template default and
          fight the left-aligned rhythm of every other section. */}
      <section className="px-4 sm:px-6 lg:px-8">
        <SectionHead title="Connect with us" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {EVENT_SOCIALS.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              className="inline-grid size-10 place-items-center rounded-sm transition-transform hover:-translate-y-0.5"
            >
              {SOCIAL_LOGOS[s.key]}
            </a>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-brand-900/60">
          paniit.org &middot; summit@paniit.org
        </p>
      </section>
    </div>
  );
}


/**
 * Editorial section head: a title sitting on a full-width hairline,
 * with optional right-aligned meta. This is what replaced the white card
 * wrapper around each home section — the rule separates, so the box does not
 * have to, and eight identical rectangles become a page with a rhythm.
 */
function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="section-head flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[19px] font-semibold leading-none text-brand-950">
        {title}
      </h2>
      {meta ? (
        <span className="eyebrow shrink-0 text-brand-900/50">{meta}</span>
      ) : null}
    </div>
  );
}


/* Brand-color social logos — sized 28px so they read at a glance. */

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className="size-7">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.06 9.5h2.55v8.2H7.06V9.5zm1.27-3.7a1.48 1.48 0 110 2.96 1.48 1.48 0 010-2.96zM11.4 9.5h2.45v1.12h.04c.34-.64 1.18-1.32 2.42-1.32 2.59 0 3.07 1.7 3.07 3.92v4.48h-2.55v-3.97c0-.95-.02-2.17-1.32-2.17-1.33 0-1.53 1.03-1.53 2.1v4.04H11.4V9.5z"
      />
    </svg>
  );
}

function InstagramLogo() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className="size-7">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="30%" stopColor="#F77737" />
          <stop offset="55%" stopColor="#E1306C" />
          <stop offset="85%" stopColor="#833AB4" />
          <stop offset="100%" stopColor="#405DE6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect
        x="5.5"
        y="5.5"
        width="13"
        height="13"
        rx="4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.5" cy="7.6" r="0.9" fill="#fff" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className="size-7">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M16.05 5h2.16l-4.72 5.4L19 19h-4.34l-3.4-4.45L7.32 19H5.15l5.05-5.78L5 5h4.45l3.07 4.06L16.05 5zm-.76 12.7h1.2L8.78 6.23H7.5L15.29 17.7z"
        fill="#fff"
      />
    </svg>
  );
}

function YouTubeLogo() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className="size-7">
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path d="M10.2 8.6v6.8L15.8 12 10.2 8.6z" fill="#fff" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className="size-7">
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        d="M13.6 19v-6.6h2.22l.33-2.58H13.6V8.16c0-.75.21-1.26 1.28-1.26h1.37V4.6c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.21-3.34 3.43v1.9H8.7v2.58h2.21V19h2.69z"
        fill="#fff"
      />
    </svg>
  );
}
