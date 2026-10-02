import { redirect } from "next/navigation";
import { EmptyArt } from "@/components/features/empty-art";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { EVENT_ID } from "@/lib/event-config";
import { ModerateClient, type ModQuestion, type ModSession } from "./moderate-client";

export const dynamic = "force-dynamic";

/**
 * The questions sent to the sessions you moderate.
 *
 * A moderator sees the sessions an organiser assigned them to, by their
 * email; an organiser sees every session. The database decides what each
 * can read (0024_session_moderators.sql), so this page only has to ask.
 */
export default async function ModeratePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: wanted } = await searchParams;
  let sessions: ModSession[] = [];
  let questions: ModQuestion[] = [];
  let organizer = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirect=%2Fmoderate");

    const email = (user.email ?? "").toLowerCase();
    const [me, mine] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("session_moderators").select("session_id").eq("email", email),
    ]);
    const role = (me.data as { role: string | null } | null)?.role;
    organizer = role === "organizer" || role === "admin";
    const assigned = ((mine.data as { session_id: string }[] | null) ?? []).map((r) => r.session_id);

    let sq = supabase
      .from("sessions")
      .select("id, title, start_at, end_at, venues(name)")
      .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true });
    if (!organizer) {
      if (assigned.length === 0) sq = sq.in("id", ["00000000-0000-0000-0000-000000000000"]);
      else sq = sq.in("id", assigned);
    }
    const { data: s } = await sq;
    sessions = ((s ?? []) as unknown as Array<{
      id: string;
      title: string;
      start_at: string;
      end_at: string;
      venues: { name: string | null } | { name: string | null }[] | null;
    }>).map((r) => ({
      id: r.id,
      title: r.title,
      start_at: r.start_at,
      end_at: r.end_at,
      venue: (Array.isArray(r.venues) ? r.venues[0]?.name : r.venues?.name) ?? null,
    }));

    if (sessions.length) {
      const { data: q } = await supabase
        .from("session_questions")
        .select(
          "id, session_id, question, status, is_answered, is_pinned, is_anonymous, created_at, profiles:user_id(full_name, designation, company)"
        )
        .in(
          "session_id",
          sessions.map((x) => x.id)
        )
        .order("created_at", { ascending: false });
      questions = (q as unknown as ModQuestion[] | null) ?? [];
    }
  } catch (err) {
    rethrowIfRedirect(err);
    // eslint-disable-next-line no-console
    console.error("[moderate] load failed", err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-10 pt-5 lg:pt-8">
      <h1 className="font-display text-2xl font-semibold text-brand-950">Session questions</h1>

      {sessions.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <EmptyArt name="empty-team" className="mb-3" />
          <p className="text-[14px] text-brand-950">You are not moderating any session yet.</p>
          <p className="mt-1 text-[12.5px] text-brand-900/60">
            An organiser assigns moderators by email from the admin panel.
          </p>
        </div>
      ) : (
        <ModerateClient
          sessions={sessions}
          initialQuestions={questions}
          initialSession={wanted && sessions.some((s) => s.id === wanted) ? wanted : null}
        />
      )}
    </div>
  );
}
