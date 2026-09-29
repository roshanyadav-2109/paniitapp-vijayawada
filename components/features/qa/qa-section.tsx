import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { QaClient, type MyQuestion } from "./qa-client";

/**
 * A session's questions, from the side of the person asking.
 *
 * Questions go to the session's moderators, who choose what to put to the
 * panel; nobody else reads them (see 0024_session_moderators.sql). So this
 * is somewhere to ask and a list of what you asked, with whether it was
 * answered, and for a moderator of this session, the way to the questions.
 */
export async function QaSection({ sessionId }: { sessionId: string }) {
  let userId: string | null = null;
  let mine: MyQuestion[] = [];
  let canModerate = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (user) {
      const email = (user.email ?? "").toLowerCase();
      const [q, mod, me] = await Promise.all([
        supabase
          .from("session_questions")
          .select("id, question, status, is_answered, is_anonymous, created_at")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_moderators")
          .select("session_id")
          .eq("session_id", sessionId)
          .eq("email", email)
          .maybeSingle(),
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      ]);
      mine = (q.data as MyQuestion[] | null) ?? [];
      const role = (me.data as { role: string | null } | null)?.role;
      canModerate = !!mod.data || role === "organizer" || role === "admin";
    }
  } catch (err) {
    rethrowIfRedirect(err);
    // eslint-disable-next-line no-console
    console.error("[qa section] data fetch failed", err);
  }

  return (
    <QaClient
      sessionId={sessionId}
      userId={userId}
      canModerate={canModerate}
      initialMine={mine}
    />
  );
}
