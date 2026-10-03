import Image from "next/image";
import { LoginCta } from "@/components/features/login-cta";
import { SafeSection } from "@/components/features/safe-section";
import { InstagramLogo, LinkedInLogo, XLogo } from "@/components/features/brand-logos";
import { getViewer } from "@/lib/viewer";
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
  EVENT_SCALE,
  EVENT_SCALE_EXHIBITOR_ICON,
  EVENT_SCALE_STANDIN,
  type EventScaleStat,
  EVENT_SOCIALS,
  type EventSocial,
  EVENT_STORAGE_PREFIX,
  EVENT_TAGLINE,
  EVENT_VIDEO_EMBED,
  EVENT_LIVE_STREAM,
  EVENT_VENUE,
} from "@/lib/event-config";
import { HeroCarousel } from "./hero-carousel";
import { SponsorsBoard, type SponsorTier } from "./sponsors-marquee";
import { QuickActions } from "./quick-actions";
import { IitMarquee } from "./iit-marquee";
import { EventScale } from "@/components/features/event-scale";
import { FrameCta } from "./frame-camera";
import { TicketsBanner } from "./tickets-banner";
import { AppPromptBanner } from "@/components/features/app-prompt-banner";
import {
  getPublicExhibitorCount,
  getPublicKeyParticipants,
  getPublicSponsorTiers,
} from "@/lib/public-data";
import { LegacySpeakers } from "@/components/features/legacy-speakers";
import { PastSponsors } from "@/components/features/past-sponsors";
import { PostStrip } from "@/components/features/post-strip";
import { PressStrip } from "@/components/features/press-strip";
import { SectorMarquee } from "@/components/features/sector-marquee";
import { KeyParticipantsStrip } from "./key-participants-strip";
import { Venue3dCta } from "./venue-3d-cta";

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
  kind: "session";
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

    // Everything the home screen needs at once, rather than five round
    // trips one after another — the page could not start rendering until the
    // last of them came back, which is what left the splash screen up.
    // Three of them are the same for every visitor and come from the shared
    // cache (lib/public-data.ts); only the role and the bookmarks are this
    // person's.
    const [roleRes, exhibitors, kp, tiers, bookmarkRes] =
      await Promise.all([
        user
          ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        getPublicExhibitorCount(),
        getPublicKeyParticipants(),
        getPublicSponsorTiers(
          SPONSOR_TIER_FOLDERS,
          LOGO_BUCKET,
          EVENT_STORAGE_PREFIX
        ),
        user
          ? supabase
              .from("session_bookmarks")
              .select(
                "sessions(id, title, start_at, end_at, session_speakers(profiles:speaker_id(full_name)))",
              )
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as unknown[] }),
      ]);

    role = ((roleRes.data as { role: string | null } | null)?.role) ?? null;
    exhibitorCount = exhibitors ?? null;
    keyPeople = kp as unknown as KeyPerson[];
    sponsorTiers = tiers as unknown as SponsorTier[];

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

  const viewer = await getViewer();
  const signedIn = viewer.signedIn;

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
      <SafeSection className="px-3 sm:px-5 lg:px-6">
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
        <AppPromptBanner
          signedIn={signedIn}
          pushRegistered={viewer.pushRegistered}
          scope={viewer.userId}
        />
        <div className="mt-3">
          <EventScale stats={scaleStats} />
        </div>
      </SafeSection>

      {/* Registration and the summit photo, close together: two calls to
          act, one under the other, rather than two sections. */}
      <SafeSection className="space-y-3 px-3 sm:px-5 lg:px-6">
        <FrameCta />
      </SafeSection>

      {/* The four things you actually do in the app — badge, scanner,
          secretariat, programme — directly under the masthead. Someone
          opening this at the door wants a QR code, not a photograph. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <QuickActions role={role} />
      </SafeSection>

      {/* The day's live stream, above the guests, while it runs. Muted
          autoplay: a phone will not play sound nobody asked for. */}
      {EVENT_LIVE_STREAM ? (
        <SafeSection className="px-3 sm:px-5 lg:px-6">
          <div className="rounded-lg bg-[#E9EAEE] p-3">
          <p className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold tracking-[0.08em] text-[#DD002B]">
            <LiveMark />
            LIVE
          </p>
          <div className="overflow-hidden rounded-md bg-black">
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${EVENT_LIVE_STREAM.id}?playsinline=1&rel=0&autoplay=1&mute=1`}
                title={EVENT_LIVE_STREAM.caption}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute left-0 top-0 h-full w-full"
              />
            </div>
          </div>
          <p className="mt-3 font-display text-[15px] font-semibold leading-snug text-brand-950">
            {EVENT_LIVE_STREAM.caption}
          </p>
          </div>
        </SafeSection>
      ) : null}

      {/* Key guests & speakers */}
      {keyPeople.length > 0 ? (
        <SafeSection>
          <div className="px-3 sm:px-5 lg:px-6">
            <SectionHead title="Key guests & speakers" />
          </div>
          <div className="mt-4">
            <KeyParticipantsStrip people={keyPeople} />
          </div>
          {/* The strip shows one person at a time, which is no way to find
              somebody in particular; this opens the whole list. */}
          <div className="mt-4 px-3 sm:px-5 lg:px-6">
            <Link
              href="/speakers"
              className="flex h-11 w-full items-center justify-center rounded-md bg-brand-800 text-[13px] font-semibold text-white transition-colors hover:bg-brand-900"
            >
              View all
            </Link>
          </div>
        </SafeSection>
      ) : null}

      {/* The venue in 3D, under the guests: where they will all be. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <Venue3dCta />
      </SafeSection>

      {/* Tickets, under the venue. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <TicketsBanner />
      </SafeSection>

      {/* The sectors the summit's sessions cover, on a white panel of their
          own. The card's padding is the page gutter, so the marquee's own
          full-bleed lands exactly on the card's edges rather than
          overshooting them. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <div className="rounded-lg bg-paper-raised px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <SectionHead title="Focussed Sectors" />
          <div className="mt-4">
            <SectorMarquee />
          </div>
        </div>
      </SafeSection>

      {/* Below the sectors, where a guest has just seen what the summit is
          about and has a reason to want the rest. */}
      {!signedIn ? (
        <SafeSection className="px-3 sm:px-5 lg:px-6">
          <LoginCta next="/home" />
        </SafeSection>
      ) : null}

      {/* The two leaders the summit is held under, above the day. Full
          bleed to the card's edges and 2:1, the ratio it was made at, so the
          faces are never cropped out of it on a narrow screen. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-lg">
          <Image
            src="/ui/leadership-banner.webp"
            alt="Prime Minister Narendra Modi and Chief Minister N. Chandrababu Naidu, with the map of Andhra Pradesh"
            width={1600}
            height={800}
            sizes="(max-width: 1024px) 100vw, 960px"
            className="h-auto w-full"
          />
        </div>
      </SafeSection>

      {/*
        Today's calendar. Was a white card containing a stack of smaller white
        cards — a box inside a box, with the border doing the work twice. Now
        the section rule separates it from what is above and hairlines separate
        the rows, so the timetable reads as a timetable.
      */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Today’s calendar" />
        {calendar.length === 0 ? (
          <p className="mt-4 max-w-prose text-[14px] leading-7 text-brand-900/70">
            Your day is open. Bookmark sessions in Agenda to fill this in.
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
                      Session
                      {e.presenter ? <> | {e.presenter}</> : null}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 self-center text-brand-900/35 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SafeSection>

      {/* About */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
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
      </SafeSection>

      {/* Video — a live stream on the day, a recording before it. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
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
      </SafeSection>

      {/* Previous editions. "Legacy" and "Past" are doing the work in the
          two titles — these are not this summit's line-up or its sponsors. */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Legacy of eminent speakers" />
        <div className="mt-5">
          <LegacySpeakers />
        </div>
      </SafeSection>

      <SafeSection className="px-3 sm:px-5 lg:px-6">
        <SectionHead title="Past sponsors" />
        {/* On a white panel, not on the ground: twelve of these seventeen
            logos are published with an opaque white panel baked into the
            artwork. That was invisible while the page was white and would
            show as a grid of white rectangles on the tint. */}
        <div className="mt-5 rounded-lg bg-paper-raised p-5 sm:p-6">
          <PastSponsors />
        </div>
      </SafeSection>

      {/* Sponsors */}
      {sponsorTiers.length > 0 ? (
        <SafeSection className="px-3 sm:px-5 lg:px-6">
          <SponsorsBoard tiers={sponsorTiers} />
        </SafeSection>
      ) : null}

      {/* Connect */}
      <SafeSection className="px-3 sm:px-5 lg:px-6">
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
      </SafeSection>

      {/* The skyline closes the page and stays its last element — anything
          added later goes above this, never below it. Full-bleed and flush
          with the foot: the sections' side padding would leave a city
          floating in the middle of the page, and the container's bottom
          padding would leave a strip of ground under it. */}
      {/* Sized to land on the bar rather than somewhere above it. Below the
          image sit the column's own 24px and the layout's 128px, which is
          there so nothing ends up behind the navigation bar — 152px in all,
          against a bar 88px tall plus whatever the phone reserves for its
          home indicator. Pulling back the difference leaves exactly the bar,
          and the city meets it. */}
      <div className="skyline-foot select-none">
        <Image
          src="/ui/skyline-footer.webp"
          alt=""
          aria-hidden
          width={1600}
          height={781}
          sizes="100vw"
          className="h-auto w-full"
        />
      </div>
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

/** A broadcast mark: a dot with a signal on either side, in the live red. */
function LiveMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" />
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
