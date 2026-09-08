import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, ExternalLink, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScheduleMeetingButton } from "@/components/features/schedule-meeting-button";
import { GmailIcon, LinkedInIcon } from "@/components/features/social-icons";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ExhibitorDetail {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  booth_number: string | null;
  location_floor: string | null;
  category: string | null;
}

interface TeamRow {
  id: string;
  profile_id: string | null;
  full_name: string;
  designation: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
}

export default async function ExhibitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let exhibitor: ExhibitorDetail | null = null;
  let team: TeamRow[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("exhibitors")
      .select(
        "id, name, tagline, about, logo_url, cover_url, website, booth_number, location_floor, category"
      )
      .eq("id", id)
      .maybeSingle();
    exhibitor = (data as ExhibitorDetail | null) ?? null;
    if (!exhibitor) notFound();

    const { data: t } = await supabase
      .from("exhibitor_team_members")
      .select("id, profile_id, full_name, designation, photo_url, email, linkedin_url")
      .eq("exhibitor_id", id)
      .order("display_order", { ascending: true })
      .order("full_name", { ascending: true });
    team = (t as TeamRow[] | null) ?? [];
  } catch {
    notFound();
  }

  if (!exhibitor) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      {/* Cover + logo */}
      <section className="overflow-hidden rounded-lg border border-brand-100 bg-white">
        {exhibitor.cover_url ? (
          <div className="relative h-32 w-full bg-brand-50">
            <Image
              src={exhibitor.cover_url}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-20 w-full bg-[radial-gradient(circle_at_top_left,#3b329e_0%,#1B1464_100%)]" />
        )}
        <div className="-mt-10 px-5 pb-5">
          <div className="inline-grid size-20 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-brand-100 shadow-sm">
            {exhibitor.logo_url ? (
              <Image
                src={exhibitor.logo_url}
                alt={exhibitor.name}
                width={80}
                height={80}
                className="size-full object-contain p-2"
              />
            ) : (
              <Store className="size-7 text-brand-800/65" />
            )}
          </div>
          <h1 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-brand-950">
            {exhibitor.name}
          </h1>
          {exhibitor.tagline ? (
            <p className="mt-1 text-sm font-medium text-brand-900/85">
              {exhibitor.tagline}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {exhibitor.category ? (
              <span className="inline-flex items-center rounded-[4px] border border-slate-900/25 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
                {exhibitor.category}
              </span>
            ) : null}
            {exhibitor.booth_number || exhibitor.location_floor ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] border border-slate-900/25 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
                <MapPin className="size-3" strokeWidth={1.8} />
                {[exhibitor.booth_number, exhibitor.location_floor]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            {exhibitor.website ? (
              <a
                href={exhibitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[4px] border border-slate-900/25 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-slate-50"
              >
                <ExternalLink className="size-3" strokeWidth={1.8} />
                Website
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* About */}
      {exhibitor.about ? (
        <section className="rounded-lg border border-brand-100 bg-white p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-800/75">
            About
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-900">
            {exhibitor.about}
          </p>
        </section>
      ) : null}

      {/* Team */}
      <section className="rounded-lg border border-brand-100 bg-white p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-800/75">
          Team on ground
        </h2>
        {team.length === 0 ? (
          <p className="mt-3 text-sm text-brand-900/75">
            Team members will be listed here closer to the event.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {team.map((t) => (
              <li key={t.id}>
                <TeamRow t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TeamRow({ t }: { t: TeamRow }) {
  const identity = (
    <>
      <Avatar className="size-12 shrink-0 ring-1 ring-brand-100">
        {t.photo_url ? <AvatarImage src={t.photo_url} alt={t.full_name} /> : null}
        <AvatarFallback className="bg-brand-50 text-[13px] font-semibold text-brand-800">
          {initials(t.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-brand-950">
          {t.full_name}
        </div>
        {t.designation ? (
          <div className="mt-0.5 truncate text-[12px] text-brand-900/75">
            {t.designation}
          </div>
        ) : null}
      </div>
    </>
  );

  const socials = (
    <div className="ml-1 flex shrink-0 items-center gap-2">
      {t.linkedin_url ? (
        <a
          href={t.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="inline-flex transition-opacity hover:opacity-75"
        >
          <LinkedInIcon className="size-[18px]" />
        </a>
      ) : null}
      {t.email ? (
        <a
          href={`mailto:${t.email}`}
          aria-label="Email"
          className="inline-flex transition-opacity hover:opacity-75"
        >
          <GmailIcon className="size-[18px]" />
        </a>
      ) : null}
    </div>
  );

  // If the team member is a linked attendee, the identity area becomes a
  // profile link. The social icons stay outside the Link so we never nest
  // <a> in <a> (and server-component onClick handlers aren't needed to stop
  // propagation — they'd break the RSC render anyway).
  return t.profile_id ? (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3">
      <Link
        href={`/attendees/${t.profile_id}`}
        className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
      >
        {identity}
      </Link>
      {socials}
      <div className="hidden sm:block">
        <ScheduleMeetingButton inviteeId={t.profile_id} />
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3">
      {identity}
      {socials}
    </div>
  );
}
