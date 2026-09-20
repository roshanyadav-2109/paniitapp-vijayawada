import Image from "next/image";
import { LoginCta } from "@/components/features/login-cta";
import { isSignedIn } from "@/lib/viewer";
import Link from "next/link";
import { emptied } from "@/lib/dev-empty";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
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
  EVENT_SCALE,
  EVENT_SCALE_EXHIBITOR_ICON,
  EVENT_SCALE_STANDIN,
  type EventScaleStat,
  EVENT_SOCIALS,
  type EventSocial,
  EVENT_STORAGE_PREFIX,
  EVENT_TAGLINE,
  EVENT_VIDEO_EMBED,
  EVENT_VENUE,
} from "@/lib/event-config";
import { HeroCarousel } from "./hero-carousel";
import { SponsorsBoard, type SponsorTier } from "./sponsors-marquee";
import { QuickActions } from "./quick-actions";
import { IitMarquee } from "./iit-marquee";
import { EventScale } from "@/components/features/event-scale";
import { GatePassBanner } from "./gate-pass-banner";
import { AppPromptBanner } from "@/components/features/app-prompt-banner";
import { LegacySpeakers } from "@/components/features/legacy-speakers";
import { PastSponsors } from "@/components/features/past-sponsors";
import { PostStrip } from "@/components/features/post-strip";
import { PressStrip } from "@/components/features/press-strip";
import { SectorMarquee } from "@/components/features/sector-marquee";
import { KeyParticipantsStrip } from "./key-participants-strip";

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
  // null = the count could not be read, which is not the same as zero.
  let exhibitorCount: number | null = null;

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

    // head:true — the rows are not needed, only how many there are.
    const { count: exhibitors } = await supabase
      .from("exhibitors")
      .select("id", { count: "exact", head: true })
      .eq("event_id", EVENT_ID);
    exhibitorCount = exhibitors ?? null;

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
          .then((res) => ({ folder, data: res.data ?? [] })),
      ),
    );
    sponsorTiers = sponsorListings
      .map(({ folder, data }) => {
        const logos = data
          .filter(
            (item) =>
              !!item.name &&
              !item.name.startsWith(".") &&
              /\.(png|jpe?g|webp|svg|avif|gif)$/i.test(item.name),
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
              "id, requester_id, invitee_id, accepted_slot, status, requester:requester_id(id, full_name), invitee:invitee_id(id, full_name)",
            )
            .eq("event_id", EVENT_ID)
            .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
            .eq("status", "accepted")
        : Promise.resolve({ data: [] as unknown[] }),
      user
        ? supabase
            .from("session_bookmarks")
            .select(
              "sessions(id, title, start_at, end_at, session_speakers(profiles:speaker_id(full_name)))",
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
      session_speakers: Array<{
        profiles:
          { full_name: string | null } | { full_name: string | null }[] | null;
      }> | null;
    };
    const bookmarks = (
      (bookmarkRes.data ?? []) as Array<{
        sessions: BookmarkedSession | null;
      }>
    )
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
      if (names.length === 2) return `${names[0]} | ${names[1]}`;
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

  const signedIn = await isSignedIn();

  const scaleStats: EventScaleStat[] = [
    exhibitorCount && exhibitorCount > 0
      ? {
          value: String(exhibitorCount),
          label: "Exhibitors",
          short: "Exhibitors",
          icon: EVENT_SCALE_EXHIBITOR_ICON,
        }
      : EVENT_SCALE_STANDIN,
    ...EVENT_SCALE,
  ];


  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  calendar = emptied(calendar);
  keyPeople = emptied(keyPeople);
  sponsorTiers = emptied(sponsorTiers);

  return (
    <div className="-mx-3 space-y-14 pb-6 pt-4 sm:-mx-5 lg:mx-auto lg:w-[85vw] lg:max-w-6xl lg:space-y-20 lg:px-0 lg:pt-8">
      {/* Carousel and the Andhra panel as one card: the pictures and the
          theme line they illustrate are a single opening statement, and two
          separated blocks read as two. The carousel's slides carry no radius
          or border of their own — this card is what they sit in — and the
          dots row divides the picture from the text.

          The carousel no longer breaks out past the column on desktop. It
          did when it was its own object; a card cannot be two widths.

          Masthead history, since it has moved twice: a radial
          purple-to-navy gradient card, then a flat navy one, then nothing at
          all on a white page, which left it with no edges. White again, and
          the cool ground is what gives it its edge. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-lg bg-paper-raised">
          {/* A little card showing around the picture on three sides. Flush
              to the edges, the photograph was the card's own boundary and
              the white below it looked like a separate thing stuck on. The
              dots row supplies the fourth side. */}
          <div className="p-2 pb-0 sm:p-2.5 sm:pb-0">
            <HeroCarousel />
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            {/* No max-width: 22ch broke the line early and left a column of
                empty card to the right of it, so the theme line read as a
                narrow block rather than as the panel's headline. It uses the
                panel now and breaks where the panel ends. */}
            <h2 className="font-display text-[26px] font-semibold leading-[1.15] text-brand-950 sm:text-[30px]">
              {EVENT_TAGLINE}
            </h2>

            <dl className="mt-3">
              <div className="flex items-start gap-3 py-1.5">
                <dt className="sr-only">Date</dt>
                {/* iit-400 was picked to carry on navy and goes pale on white. */}
                <CalendarDays
                  className="mt-[3px] size-4 shrink-0 text-brand-800"
                  strokeWidth={1.6}
                />
                <dd className="text-[13px] leading-snug text-brand-900/80">
                  {SUMMIT_DATE_LABEL}
                </dd>
              </div>
              <div className="flex items-start gap-3 py-1.5">
                <dt className="sr-only">Venue</dt>
                <MapPin
                  className="mt-[3px] size-4 shrink-0 text-brand-800"
                  strokeWidth={1.6}
                />
                <dd className="text-[13px] leading-snug text-brand-900/80">
                  {SUMMIT_VENUE}
                </dd>
              </div>
            </dl>

            {/* Filled in the brand navy — solid, so it needs no hairline to be
                a button. The Maps pin keeps its own colours against it. */}
            <a
              href={SUMMIT_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
            >
              <GoogleMapsPin />
              View directions
            </a>

            {/* The two bodies behind the summit, under the button rather
                than over the theme line: a pair of crests above a headline
                reads as a letterhead, and the panel's job is the headline.
                Sized to their own optical weight — a square mark and a round
                seal at one pixel height do not look the same size. */}
            <div className="mt-5 flex items-center justify-center gap-3 border-t border-rule pt-4">
              <Image
                src="/logo/paniit-mark.png"
                alt="PanIIT Alumni India"
                width={289}
                height={288}
                className="h-8 w-auto"
              />
              <Image
                src="/logo/ap-government.webp"
                alt="Government of Andhra Pradesh"
                width={384}
                height={400}
                className="h-9 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Outside the card, on the ground under it: install the app, then
            the scale of the event. Both render nothing when they have
            nothing to say, and the margins go with them. */}
        <AppPromptBanner signedIn={signedIn} />
        <div className="mt-3">
          <EventScale stats={scaleStats} />
        </div>
      </section>

      {/* The four things you actually do in the app — badge, scanner,
          secretariat, programme — directly under the masthead. Someone
          opening this at the door wants a QR code, not a photograph. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <QuickActions role={role} />
      </section>

      {/* The pass, under the four tiles: it is what you open at the door,
          and the tiles are what you open before you get there. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <GatePassBanner signedIn={signedIn} />
      </section>

      {/* Key guests & speakers */}
      {keyPeople.length > 0 ? (
        <section>
          <div className="px-3 sm:px-5 lg:px-6">
            <SectionHead title="Key guests & speakers" />
          </div>
          <div className="mt-4">
            <KeyParticipantsStrip people={keyPeople} />
          </div>
        </section>
      ) : null}

      {/* The sectors the summit's sessions cover, on a white panel of their
          own. The card's padding is the page gutter, so the marquee's own
          full-bleed lands exactly on the card's edges rather than
          overshooting them. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <div className="rounded-lg bg-paper-raised px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <SectionHead title="Focussed Sectors" />
          <div className="mt-4">
            <SectorMarquee />
          </div>
        </div>
      </section>

      {/* Below the sectors, where a guest has just seen what the summit is
          about and has a reason to want the rest. */}
      {!signedIn ? (
        <section className="px-3 sm:px-5 lg:px-6">
          <LoginCta next="/home" />
        </section>
      ) : null}

      {/*
        Today's calendar. Was a white card containing a stack of smaller white
        cards — a box inside a box, with the border doing the work twice. Now
        the section rule separates it from what is above and hairlines separate
        the rows, so the timetable reads as a timetable.
      */}
      <section className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Today’s calendar" />
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
                      {e.presenter ? <> | {e.presenter}</> : null}
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
      <section className="px-3 sm:px-5 lg:px-6">
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
        <IitMarquee />
      </section>

      {/* Video — a live stream on the day, a recording before it. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <SectionHead
          title={EVENT_VIDEO_EMBED.heading}
          meta={EVENT_VIDEO_EMBED.isLive ? "Live" : undefined}
        />
        <div className="mt-4 overflow-hidden rounded-lg bg-black">
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${EVENT_VIDEO_EMBED.id}?playsinline=1&rel=0${
                EVENT_VIDEO_EMBED.isLive ? "&autoplay=1&mute=1" : ""
              }`}
              title={EVENT_VIDEO_EMBED.caption}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute left-0 top-0 h-full w-full"
            />
          </div>
        </div>
        <p className="mt-3 font-display text-[15px] font-semibold leading-snug text-brand-950">
          {EVENT_VIDEO_EMBED.caption}
        </p>
        <div className="mt-5">
          <PressStrip />
        </div>
        {/* The same story as the press cards above, told by the people in it
            rather than about them — so it sits under them, not in its own
            section. */}
        <div className="mt-3">
          <PostStrip />
        </div>
      </section>

      {/* Previous editions. "Legacy" and "Past" are doing the work in the
          two titles — these are not this summit's line-up or its sponsors. */}
      <section className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Legacy of eminent speakers" />
        <div className="mt-5">
          <LegacySpeakers />
        </div>
      </section>

      <section className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Past sponsors" />
        {/* On a white panel, not on the ground: twelve of these seventeen
            logos are published with an opaque white panel baked into the
            artwork. That was invisible while the page was white and would
            show as a grid of white rectangles on the tint. */}
        <div className="mt-5 rounded-lg bg-paper-raised p-5 sm:p-6">
          <PastSponsors />
        </div>
      </section>

      {/* Sponsors */}
      {sponsorTiers.length > 0 ? (
        <section className="px-3 sm:px-5 lg:px-6">
          <SponsorsBoard tiers={sponsorTiers} />
        </section>
      ) : null}

      {/* Connect */}
      <section className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Connect with us" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

/**
 * Google Maps marker. Drawn inline rather than pulled from the Solar set,
 * the same way the social marks further down this file are — the point is
 * that it is recognisably Maps, and a generic grey pin would not say where
 * the link goes.
 */
function GoogleMapsPin() {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-[18px] shrink-0"
    >
      <path
        fill="#EA4335"
        d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}

/* Brand-color social logos — sized 28px so they read at a glance. */

function LinkedInLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-7"
    >
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
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-7"
    >
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
      <circle
        cx="12"
        cy="12"
        r="3.1"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
      />
      <circle cx="16.5" cy="7.6" r="0.9" fill="#fff" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-7"
    >
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
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-7"
    >
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path d="M10.2 8.6v6.8L15.8 12 10.2 8.6z" fill="#fff" />
    </svg>
  );
}

function FacebookLogo() {

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-7"
    >
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        d="M13.6 19v-6.6h2.22l.33-2.58H13.6V8.16c0-.75.21-1.26 1.28-1.26h1.37V4.6c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.21-3.34 3.43v1.9H8.7v2.58h2.21V19h2.69z"
        fill="#fff"
      />
    </svg>
  );
}
