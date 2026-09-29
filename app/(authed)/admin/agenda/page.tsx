import Link from "next/link";
import { EVENT_ID } from "@/lib/event-config";
import { organizerClient, Restricted } from "../guard";
import { AgendaAdmin, type AdminSession, type AdminVenue } from "./agenda-admin";

export const dynamic = "force-dynamic";

export default async function AdminAgendaPage() {
  const supabase = await organizerClient();
  if (!supabase) return <Restricted />;

  const [s, v, m] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, description, start_at, end_at, venue_id, session_type, track, is_featured")
      .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true }),
    supabase.from("venues").select("id, name").eq("event_id", EVENT_ID).order("name"),
    supabase.from("session_moderators").select("session_id, email").order("created_at"),
  ]);

  const moderators = new Map<string, string[]>();
  for (const r of (m.data as { session_id: string; email: string }[] | null) ?? []) {
    moderators.set(r.session_id, [...(moderators.get(r.session_id) ?? []), r.email]);
  }
  const sessions: AdminSession[] = ((s.data as Omit<AdminSession, "moderators">[] | null) ?? []).map(
    (x) => ({ ...x, moderators: moderators.get(x.id) ?? [] })
  );

  return (
    <div className="mx-auto w-full max-w-3xl pb-10 pt-5 lg:pt-8">
      <Link href="/admin" className="text-[13px] text-brand-800">
        &larr; Admin
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-brand-950">Agenda &amp; moderators</h1>
      <AgendaAdmin sessions={sessions} venues={(v.data as AdminVenue[] | null) ?? []} />
    </div>
  );
}
