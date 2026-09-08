import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { NetworkingClient, type AttendeeRow } from "./networking-client";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
  let rows: AttendeeRow[] = [];
  let roles: string[] = [];
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    const [{ data: people }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, designation, company, role, iit_campus, graduation_year, interests, photo_url, linkedin_url, twitter_url, available_for_meetings, office_hours_enabled"
        )
        .order("full_name", { ascending: true, nullsFirst: false })
        .range(0, 49),
      supabase
        .from("profiles")
        .select("role")
        .not("role", "is", null)
        .order("role", { ascending: true }),
    ]);
    rows = (people as AttendeeRow[] | null) ?? [];
    const seen = new Set<string>();
    for (const r of roleRows ?? []) {
      const v = (r as { role: string | null }).role;
      if (v && !seen.has(v)) seen.add(v);
    }
    roles = Array.from(seen);
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 lg:pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 lg:text-3xl">
          Networking
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          2,000+ attendees across 23 IIT campuses. Find your next conversation.
        </p>
      </header>
      <NetworkingClient initialRows={rows} roles={roles} userId={userId} />
    </div>
  );
}
