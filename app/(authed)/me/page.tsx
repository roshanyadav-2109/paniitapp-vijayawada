import Image from "next/image";
import Link from "next/link";
import { Pencil, Camera } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { OfficeHoursToggle } from "@/components/features/office-hours-toggle";
import { ProfileAvatar } from "@/components/features/default-avatar";

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
    .join(" | ");
  const showOfficeHours =
    profile?.role === "vc" || profile?.role === "alumni";

  return (
    <div className="mx-auto w-full max-w-2xl px-1 pb-12 pt-6 sm:pt-7 lg:pt-9">
      {/* Photo + name. No card around any of this: the page is a single
          column of your own details, and four stacked white blocks made it
          read as four unrelated things. */}
      <div>
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
          <h1 className="mt-3 font-display text-[20px] font-semibold text-brand-950">
            {profile?.full_name ?? "Your profile"}
          </h1>
          {profile?.role ? (
            <p className="mt-0.5 eyebrow text-brand-800/75">
              {roleLabel(profile.role)}
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3.5">
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
                    className="rounded-md bg-paper-deep px-2.5 py-1 text-[12px] font-medium text-brand-900"
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
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-800 text-[13px] font-semibold tracking-tight text-white transition-colors hover:bg-brand-900"
        >
          <Pencil className="size-4" strokeWidth={1.6} />
          Edit Profile
        </Link>
      </div>

      {showOfficeHours ? (
        <div className="mt-7">
          <h2 className="font-display text-[15px] font-semibold text-brand-950">
            Availability
          </h2>
          <div className="mt-2">
            <OfficeHoursToggle initial={!!profile?.office_hours_enabled} />
          </div>
        </div>
      ) : null}

      {/* The four destinations. No rules and no boxes — the drawn icon in
          front of each one is enough to separate them. */}
      <div className="mt-6">
        <Row
          href="/attendees?tab=connections"
          icon="connections"
          label="My Connections"
          meta={connectionCount > 0 ? String(connectionCount) : undefined}
        />
        <Row href="/me/qr" icon="qr-badge" label="My QR Badge" />
        <Row
          href="/me/edit#notifications"
          icon="privacy"
          label="Privacy & Notifications"
        />

        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center py-3 text-left transition-colors hover:bg-white/50"
          >
            <span className="flex items-center gap-3.5 text-[15px] font-normal text-brand-950">
              <RowIcon name="logout" />
              Logout
            </span>
          </button>
        </form>
      </div>

      {/* The two bodies behind the summit, closing the screen. Centred and
          last: a footer, not a header — nothing here is tappable. */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <Image
          src="/logo/paniit-mark.png"
          alt="PanIIT Alumni India"
          width={289}
          height={288}
          className="h-9 w-auto"
        />
        <Image
          src="/logo/ap-government.webp"
          alt="Government of Andhra Pradesh"
          width={384}
          height={400}
          className="h-10 w-auto"
        />
      </div>
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
        className={`mt-0.5 text-[14px] font-normal text-brand-950 ${valueClass ?? ""}`}
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
            className="rounded-md bg-paper-deep px-2.5 py-1 text-[12px] font-medium text-brand-900"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The drawn row icons, cut from the supplied sheet and sized as a set. */
type RowIconName = "connections" | "qr-badge" | "privacy" | "logout";

function RowIcon({ name }: { name: RowIconName }) {
  return (
    <Image
      src={`/ui/me/${name}.webp`}
      alt=""
      width={256}
      height={256}
      sizes="56px"
      className="size-[52px] shrink-0"
    />
  );
}

function Row({
  href,
  icon,
  label,
  meta,
}: {
  href: string;
  icon: RowIconName;
  label: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-3 transition-colors hover:bg-white/50"
    >
      <span className="flex items-center gap-3.5 text-[15px] font-normal text-brand-950">
        <RowIcon name={icon} />
        {label}
      </span>
      {/* Just the number, in the IIT red the app already uses for the one
          thing on a row worth looking at. A pill made a count of people read
          as an alert waiting to be cleared, which is not what it is. */}
      {meta ? (
        <span className="text-[15px] font-normal tabular-nums text-iit-500">
          {meta}
        </span>
      ) : null}
    </Link>
  );
}
