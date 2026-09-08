import Link from "next/link";
import { ChevronRight, LogOut, Pencil, QrCode, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { OfficeHoursToggle } from "@/components/features/office-hours-toggle";
import { ProfileAvatar } from "@/components/features/default-avatar";
import {
  ConnectionsGlyph,
  ShieldChime,
} from "@/components/features/nav-icons";

export const dynamic = "force-dynamic";

interface ProfileRow {
  full_name: string | null;
  photo_url: string | null;
  role: string | null;
  company: string | null;
  designation: string | null;
  bio: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  branch: string | null;
  interests: string[] | null;
  asks: string[] | null;
  offers: string[] | null;
  office_hours_enabled: boolean | null;
}

function roleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const [host, ...tld] = domain.split(".");
  const m = (s: string, keep = 1) =>
    s.length <= keep ? s : s.slice(0, keep) + "*".repeat(Math.max(3, s.length - keep));
  return `${m(local, 1)}@${m(host, 1)}.${tld.join(".")}`;
}

export default async function MePage() {
  let profile: ProfileRow | null = null;
  let userEmail: string | null = null;
  let connectionCount = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email ?? null;
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, photo_url, role, company, designation, bio, iit_campus, graduation_year, branch, interests, asks, offers, office_hours_enabled"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("connections")
          .select("user_a", { count: "exact", head: true })
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      ]);
      profile = (data as ProfileRow | null) ?? null;
      connectionCount = count ?? 0;
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  const eduLine = [profile?.iit_campus, profile?.graduation_year, profile?.branch]
    .filter(Boolean)
    .join(" · ");
  const showOfficeHours =
    profile?.role === "vc" || profile?.role === "alumni";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2.5 pb-12 pt-6 sm:pt-7 lg:pt-9">
      {/* Photo + name + card */}
      <section className="rounded-lg border border-brand-100 bg-white px-5 pb-5 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <ProfileAvatar
              photoUrl={profile?.photo_url}
              name={profile?.full_name ?? "You"}
              className="size-24"
              ringClassName="ring-4 ring-brand-50"
            />
            <Link
              href="/me/edit"
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 inline-grid size-7 place-items-center rounded-full bg-brand-800 text-white ring-4 ring-white transition-colors hover:bg-brand-900"
            >
              <Camera className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
          <h1 className="mt-3 text-[20px] font-semibold tracking-tight text-brand-950">
            {profile?.full_name ?? "Your profile"}
          </h1>
          {profile?.role ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-800/75">
              {roleLabel(profile.role)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-3.5">
          <Field label="Designation" value={profile?.designation ?? "—"} />
          <Field label="Organization" value={profile?.company ?? "—"} />
          <Field label="Email Address" value={maskEmail(userEmail)} />
          <Field
            label="Bio"
            value={profile?.bio ?? "—"}
            valueClass="whitespace-pre-line leading-6"
          />
          {eduLine ? <Field label="Education" value={eduLine} /> : null}

          {profile?.interests?.length ? (
            <div>
              <p className="text-[12px] font-medium text-brand-900/55">
                Area of interest
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-md bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-900"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile?.asks?.length ? (
            <ChipBlock label="Looking for" items={profile.asks} />
          ) : null}
          {profile?.offers?.length ? (
            <ChipBlock label="Can offer" items={profile.offers} />
          ) : null}
        </div>

        <Link
          href="/me/edit"
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-800 text-[13px] font-semibold tracking-tight text-white transition-colors hover:bg-brand-900"
        >
          <Pencil className="size-4" strokeWidth={1.6} />
          Edit Profile
        </Link>
      </section>

      <Row
        href="/attendees?tab=connections"
        icon={<ConnectionsGlyph className="size-[18px]" strokeWidth={1.5} />}
        label="My Connections"
        meta={connectionCount > 0 ? String(connectionCount) : undefined}
      />
      <Row
        href="/me/qr"
        icon={<QrCode className="size-[18px]" strokeWidth={1.5} />}
        label="My QR Badge"
      />
      <Row
        href="/me/edit#notifications"
        icon={<ShieldChime className="size-[18px]" strokeWidth={1.5} />}
        label="Privacy & Notifications"
      />

      {showOfficeHours ? (
        <section className="rounded-lg border border-brand-100 bg-white p-4">
          <h2 className="text-[14px] font-bold tracking-tight text-brand-950">
            Availability
          </h2>
          <div className="mt-2">
            <OfficeHoursToggle initial={!!profile?.office_hours_enabled} />
          </div>
        </section>
      ) : null}

      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-between rounded-lg border border-brand-100 bg-white px-4 py-3.5 transition-colors hover:bg-brand-50/30"
        >
          <span className="flex items-center gap-3 text-[13px] font-semibold text-brand-950">
            <LogOut className="size-[18px] text-brand-800" strokeWidth={1.5} />
            Logout
          </span>
          <ChevronRight className="size-4 text-brand-800/65" />
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-brand-900/55">{label}</p>
      <p
        className={`mt-0.5 text-[14px] font-semibold text-brand-950 ${valueClass ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ChipBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-brand-900/55">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span
            key={i}
            className="rounded-md bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-900"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({
  href,
  icon,
  label,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-brand-100 bg-white px-4 py-3.5 transition-colors hover:bg-brand-50/30"
    >
      <span className="flex items-center gap-3 text-[13px] font-semibold text-brand-950">
        <span className="text-brand-800">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {meta ? (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
            {meta}
          </span>
        ) : null}
        <ChevronRight className="size-4 text-brand-800/65" />
      </span>
    </Link>
  );
}
