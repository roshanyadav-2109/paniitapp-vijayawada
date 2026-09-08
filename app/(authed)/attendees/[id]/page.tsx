import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatBubbleGlyph } from "@/components/features/chat/chat-icon";
import { ProfileAvatar } from "@/components/features/default-avatar";
import {
  GmailIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/features/social-icons";
import {
  SessionCard,
  type SessionCardData,
} from "@/components/features/session-card";
import { ScheduleMeetingButton } from "@/components/features/schedule-meeting-button";

interface ProfileRow {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  role: string | null;
  bio: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  branch: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  interests: string[] | null;
  asks: string[] | null;
  offers: string[] | null;
  photo_url: string | null;
  email: string | null;
}

export const dynamic = "force-dynamic";

function roleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

export default async function AttendeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile: ProfileRow | null = null;
  let speakingAt: SessionCardData[] = [];
  let bookmarkSet = new Set<string>();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, designation, company, role, bio, iit_campus, graduation_year, branch, linkedin_url, twitter_url, interests, asks, offers, photo_url, email"
      )
      .eq("id", id)
      .maybeSingle();
    profile = (data as ProfileRow | null) ?? null;
    if (!profile) notFound();

    const { data: sp } = await supabase
      .from("session_speakers")
      .select(
        "sessions(id, title, description, track, start_at, end_at, is_featured, capacity, current_checkins, venues(name))"
      )
      .eq("speaker_id", id);

    const rows =
      (sp as unknown as { sessions: SessionCardData | null }[] | null) ?? [];
    speakingAt = rows.map((r) => r.sessions).filter((s): s is SessionCardData => !!s);

    if (user && speakingAt.length > 0) {
      const ids = speakingAt.map((s) => s.id);
      const { data: bms } = await supabase
        .from("session_bookmarks")
        .select("session_id")
        .eq("user_id", user.id)
        .in("session_id", ids);
      bookmarkSet = new Set(
        ((bms as { session_id: string }[] | null) ?? []).map((b) => b.session_id)
      );
    }
  } catch {
    notFound();
  }

  if (!profile) notFound();

  const eduLine = [
    profile.iit_campus,
    profile.graduation_year,
    profile.branch,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12 pt-5 sm:pt-6 lg:pt-8">
      {/* Identity block */}
      <section className="rounded-lg border border-brand-100 bg-white px-6 pb-6 pt-8 text-center">
        <ProfileAvatar
          photoUrl={profile.photo_url}
          name={profile.full_name}
          className="mx-auto size-24"
          ringClassName="ring-4 ring-brand-50"
        />
        <h1 className="mt-4 text-[22px] font-semibold leading-tight text-brand-950">
          {profile.full_name ?? "Attendee"}
        </h1>
        {profile.designation || profile.company ? (
          <p className="mt-1 text-sm font-medium text-brand-900/85">
            {[profile.designation, profile.company].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {profile.role ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-800/75">
            {roleLabel(profile.role)}
          </p>
        ) : null}

        {profile.linkedin_url || profile.twitter_url || profile.email ? (
          <div className="mt-4 flex items-center justify-center gap-4">
            {profile.linkedin_url ? (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex transition-opacity hover:opacity-75"
              >
                <LinkedInIcon className="size-[22px]" />
              </a>
            ) : null}
            {profile.twitter_url ? (
              <a
                href={profile.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="inline-flex transition-opacity hover:opacity-75"
              >
                <XIcon className="size-[22px]" />
              </a>
            ) : null}
            {profile.email ? (
              <a
                href={`mailto:${profile.email}`}
                aria-label="Email"
                className="inline-flex transition-opacity hover:opacity-75"
              >
                <GmailIcon className="size-[22px]" />
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Schedule meeting + Chat — full-width CTAs */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ScheduleMeetingButton inviteeId={profile.id} />
        <Link
          href={`/chat/${profile.id}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-brand-100 bg-white text-[13px] font-semibold text-brand-900 transition-colors hover:bg-brand-50/30"
        >
          <ChatBubbleGlyph className="size-[18px]" strokeWidth={1.6} />
          Chat
        </Link>
      </div>

      {/* Combined About — bio, interests, looking-for / can-offer, and
          education live in one card with subheads, so the profile reads as
          a single "who they are" block instead of five stacked cards. */}
      {profile.bio ||
      profile.interests?.length ||
      profile.asks?.length ||
      profile.offers?.length ||
      eduLine ? (
        <section className="space-y-5 rounded-lg border border-brand-100 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-brand-950">About</h2>

          {profile.bio ? (
            <p className="whitespace-pre-line text-sm leading-6 text-brand-900">
              {profile.bio}
            </p>
          ) : null}

          {profile.interests?.length ? (
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-800/70">
                Areas of interest
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-md border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-[12px] font-medium text-brand-800"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.asks?.length ? (
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-800/70">
                Looking for
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.asks.map((i) => (
                  <span
                    key={i}
                    className="rounded-md border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-[12px] font-medium text-brand-800"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.offers?.length ? (
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-800/70">
                Can offer
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.offers.map((i) => (
                  <span
                    key={i}
                    className="rounded-md border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-[12px] font-medium text-brand-800"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {eduLine ? (
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-800/70">
                Education
              </h3>
              <p className="mt-1.5 text-sm font-medium text-brand-900">
                {eduLine}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Speaking at */}
      {speakingAt.length > 0 ? (
        <section className="rounded-lg border border-brand-100 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-brand-950">
            Speaking at
          </h2>
          <ul className="mt-3 space-y-3">
            {speakingAt.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} bookmarked={bookmarkSet.has(s.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
