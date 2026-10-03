import Image from "next/image";
import { ManageStall } from "./manage-stall";
import { BusinessEnquiry, type EnquiryPrefill } from "./business-enquiry";
import { rethrowIfRedirect } from "@/lib/redirect";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EVENT_ID } from "@/lib/event-config";
import { GmailIcon, LinkedInIcon } from "@/components/features/social-icons";
import { FacebookMark, InstagramMark, LinkedInMark, XMark, YouTubeMark } from "@/components/features/official-marks";
import { initials } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { pavilionOf } from "@/lib/pavilions";

export const dynamic = "force-dynamic";

export interface StallSocial {
  linkedin?: string;
  x?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
}

interface ExhibitorDetail {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  website: string | null;
  booth_number: string | null;
  location_floor: string | null;
  category: string | null;
  social_links: StallSocial | null;
  showcase: string | null;
  based_in: string | null;
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

const SOCIALS: { key: keyof StallSocial; label: string; Logo: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "linkedin", label: "LinkedIn", Logo: LinkedInMark },
  { key: "x", label: "X", Logo: XMark },
  { key: "instagram", label: "Instagram", Logo: InstagramMark },
  { key: "youtube", label: "YouTube", Logo: YouTubeMark },
  { key: "facebook", label: "Facebook", Logo: FacebookMark },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExhibitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let exhibitor: ExhibitorDetail | null = null;
  let team: TeamRow[] = [];
  // The viewer's own place at this stall, if they have one, and its
  // access list for the owner's team panel. An organiser may change any
  // stall, as its owner can.
  let myRole: "owner" | "member" | null = null;
  let access: { email: string; role: "owner" | "member" }[] = [];
  // The enquiry form starts with the signed-in person's own details.
  let prefill: EnquiryPrefill = { userId: null, name: "", email: "", company: "", designation: "" };
  // What people have sent this stall; read only by its team (0032).
  let enquiries: EnquiryRow[] = [];

  try {
    const supabase = await createClient();
    if (UUID.test(id)) {
      const { data } = await supabase
        .from("exhibitors")
        .select(
          "id, name, tagline, about, logo_url, website, booth_number, location_floor, category, social_links, showcase, based_in"
        )
        .eq("id", id)
        .eq("event_id", EVENT_ID)
        .maybeSingle();
      exhibitor = (data as ExhibitorDetail | null) ?? null;
    }

    if (!exhibitor) notFound();

    if (UUID.test(id)) {
      const { data: t } = await supabase
        .from("exhibitor_team_members")
        .select("id, profile_id, full_name, designation, photo_url, email, linkedin_url")
        .eq("exhibitor_id", id)
        .order("display_order", { ascending: true })
        .order("full_name", { ascending: true });
      team = (t as TeamRow[] | null) ?? [];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase();
      if (user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("full_name, company, designation")
          .eq("id", user.id)
          .maybeSingle();
        prefill = {
          userId: user.id,
          name: me?.full_name ?? "",
          email: email ?? "",
          company: me?.company ?? "",
          designation: me?.designation ?? "",
        };
      }
      if (email) {
        const { data: acc } = await supabase
          .from("exhibitor_access")
          .select("email, role")
          .eq("exhibitor_id", id)
          .order("role", { ascending: false })
          .order("email", { ascending: true });
        access = (acc as typeof access | null) ?? [];
        myRole = access.find((a) => a.email === email)?.role ?? null;
        if (!myRole && (await getViewer()).isAdmin) myRole = "owner";
      }
      if (myRole) {
        const { data: enq } = await supabase
          .from("exhibitor_enquiries")
          .select("id, name, email, company, designation, message, created_at")
          .eq("exhibitor_id", id)
          .order("created_at", { ascending: false });
        enquiries = (enq as EnquiryRow[] | null) ?? [];
      }
    }
  } catch (err) {
    rethrowIfRedirect(err);
    notFound();
  }

  if (!exhibitor) notFound();

  const pavilion = exhibitor.category ? pavilionOf(exhibitor.category) : null;
  const social = exhibitor.social_links ?? {};
  const links = SOCIALS.filter((s) => social[s.key]);

  return (
    <div className="mx-auto w-full max-w-2xl pb-12 pt-2">
      {myRole ? (
        <div className="mb-6">
          <ManageStall
            id={exhibitor.id}
            role={myRole}
            team={access}
            initial={{
              name: exhibitor.name,
              tagline: exhibitor.tagline ?? "",
              about: exhibitor.about ?? "",
              website: exhibitor.website ?? "",
              category: exhibitor.category ?? "",
              logo_url: exhibitor.logo_url ?? "",
              showcase: exhibitor.showcase ?? "",
              based_in: exhibitor.based_in ?? "",
              social: {
                linkedin: social.linkedin ?? "",
                x: social.x ?? "",
                instagram: social.instagram ?? "",
                youtube: social.youtube ?? "",
                facebook: social.facebook ?? "",
              },
            }}
          />
        </div>
      ) : null}

      {/* Who they are, where to find them, and what they do: one box */}
      <section className="rounded-[4px] border border-rule bg-white p-3 sm:p-4">
      <header className="flex items-start gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[4px] border border-rule bg-white">
          {exhibitor.logo_url ? (
            <Image src={exhibitor.logo_url} alt={exhibitor.name} width={80} height={80} className="size-full object-contain p-2" />
          ) : (
            <span className="text-[22px] font-semibold tracking-tight text-brand-950">{initials(exhibitor.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold leading-tight text-brand-950">{exhibitor.name}</h1>
          {pavilion ? <p className="mt-1 text-[14px] text-brand-950">{pavilion.key}</p> : null}
          {exhibitor.booth_number || exhibitor.location_floor ? (
            <p className="mt-1 text-[14px] text-brand-950">
              {exhibitor.booth_number ? <span className="font-medium">Stall {exhibitor.booth_number}</span> : null}
              {exhibitor.booth_number && exhibitor.location_floor ? <span className="mx-2">|</span> : null}
              {exhibitor.location_floor}
            </p>
          ) : null}
        </div>
      </header>

      {/* Their website, then where else to follow them */}
      {exhibitor.website ? (
        <a
          href={exhibitor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 border-b border-brand-950 pb-0.5 text-[14.5px] font-medium text-brand-950"
        >
          Visit website
          <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
        </a>
      ) : null}
      {links.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {links.map(({ key, label, Logo }) => (
            <a
              key={key}
              href={social[key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${exhibitor.name} on ${label}`}
              className="inline-flex transition-opacity hover:opacity-80"
            >
              <Logo className="size-7" />
            </a>
          ))}
        </div>
      ) : null}

      {exhibitor.about ? (
        <div className="mt-6">
          <h2 className="text-[16px] font-semibold text-brand-950">About</h2>
          <p className="mt-2 whitespace-pre-line font-[family-name:var(--font-poppins)] text-[14.5px] leading-relaxed text-brand-950">
            {exhibitor.about}
          </p>
        </div>
      ) : null}
      </section>

      {exhibitor.showcase ? (
        <section className="mt-3 rounded-[4px] border border-rule bg-white p-3 sm:p-4">
          <h2 className="text-[16px] font-semibold text-brand-950">At the stall</h2>
          <p className="mt-2 whitespace-pre-line font-[family-name:var(--font-poppins)] text-[14.5px] leading-relaxed text-brand-950">
            {exhibitor.showcase}
          </p>
        </section>
      ) : null}

      {exhibitor.based_in ? (
        <section className="mt-3 rounded-[4px] border border-rule bg-white p-3 sm:p-4">
          <h2 className="text-[16px] font-semibold text-brand-950">Based in</h2>
          <p className="mt-1 text-[14.5px] text-brand-950">{exhibitor.based_in}</p>
        </section>
      ) : null}

      {team.length > 0 ? (
        <section className="mt-3 rounded-[4px] border border-rule bg-white p-3 sm:p-4">
          <h2 className="text-[16px] font-semibold text-brand-950">Team at the stall</h2>
          <ul className="mt-3 space-y-2">
            {team.map((t) => (
              <li key={t.id}>
                <TeamRow t={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {myRole ? <EnquiryList rows={enquiries} /> : null}

      <BusinessEnquiry exhibitorId={exhibitor.id} exhibitorName={exhibitor.name} prefill={prefill} />
    </div>
  );
}

type EnquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  designation: string | null;
  message: string;
  created_at: string;
};

/** The stall team's own inbox, newest first. Only they see this section. */
function EnquiryList({ rows }: { rows: EnquiryRow[] }) {
  return (
    <section className="mt-3 rounded-[4px] border border-rule bg-white p-3 sm:p-4">
      <h2 className="text-[16px] font-semibold text-brand-950">
        Business enquiries{rows.length ? ` (${rows.length})` : ""}
      </h2>
      <p className="mt-0.5 text-[12.5px] text-brand-900/60">Only your stall&rsquo;s team can see these.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-brand-900/70">No enquiries yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[4px] border border-rule p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[14.5px] font-semibold text-brand-950">{r.name}</span>
                <span className="text-[12px] text-brand-900/60">
                  {new Date(r.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {r.designation || r.company ? (
                <p className="text-[13px] text-brand-950">{[r.designation, r.company].filter(Boolean).join(", ")}</p>
              ) : null}
              <a href={`mailto:${r.email}`} className="text-[13px] font-medium text-brand-800 underline underline-offset-2">
                {r.email}
              </a>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-brand-950">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamRow({ t }: { t: TeamRow }) {
  const identity = (
    <>
      <Avatar className="size-12 shrink-0 ring-1 ring-rule">
        {t.photo_url ? <AvatarImage src={t.photo_url} alt={t.full_name} /> : null}
        <AvatarFallback className="bg-paper-deep text-[13px] font-semibold text-brand-800">
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
    <div className="flex items-center gap-3 rounded-xl border border-rule bg-white p-3">
      <Link
        href={`/attendees/${t.profile_id}`}
        className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
      >
        {identity}
      </Link>
      {socials}
    </div>
  ) : (
    <div className="flex items-center gap-3 rounded-xl border border-rule bg-white p-3">
      {identity}
      {socials}
    </div>
  );
}
