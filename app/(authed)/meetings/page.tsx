import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { MeetingsView, type MeetingRow } from "./meetings-tabs";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  let userId: string | null = null;
  let meetings: MeetingRow[] = [];
  let bookmarks: { id: string; title: string; start_at: string; end_at: string }[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (user) {
      const { data: rows } = await supabase
        .from("meetings")
        .select(
          "id, requester_id, invitee_id, message, location, proposed_slots, accepted_slot, status, proposed_outside_availability, created_at, requester:requester_id(id, full_name, photo_url, designation, company), invitee:invitee_id(id, full_name, photo_url, designation, company)"
        )
        .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      meetings = (rows as unknown as MeetingRow[] | null) ?? [];

      const { data: bm } = await supabase
        .from("session_bookmarks")
        .select("sessions(id, title, start_at, end_at)")
        .eq("user_id", user.id);
      bookmarks = ((bm as { sessions: { id: string; title: string; start_at: string; end_at: string } | null }[] | null) ?? [])
        .map((r) => r.sessions)
        .filter((s): s is { id: string; title: string; start_at: string; end_at: string } => !!s);
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-12 pt-5 lg:max-w-4xl lg:pt-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 lg:text-3xl">
          Meetings
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Schedule one-on-ones on 16 May 2026. Tap My availability to set when you&apos;re free.
        </p>
      </header>
      <MeetingsView userId={userId} meetings={meetings} bookmarks={bookmarks} />
    </div>
  );
}
