import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { QaClient, type QuestionRow, type ReplyRow } from "./qa-client";

export async function QaSection({ sessionId }: { sessionId: string }) {
  let user: { id: string } | null = null;
  let questions: QuestionRow[] = [];
  let replies: ReplyRow[] = [];
  let myQUpvotes: { question_id: string }[] = [];
  let myRUpvotes: { reply_id: string }[] = [];
  let isSpeaker = false;
  let isMod = false;

  try {
    const supabase = await createClient();
    const auth = await supabase.auth.getUser();
    user = auth.data.user ?? null;

    // session_questions has: question, upvotes, is_answered (boolean). The
    // status/is_anonymous/is_pinned/answered_by/answered_at columns come from
    // 0003_qa_replies.sql; if it hasn't run yet, we degrade gracefully.
    const qRes = await supabase
      .from("session_questions")
      .select("*, profiles:user_id(id, full_name, photo_url, role)")
      .eq("session_id", sessionId)
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });
    questions = (qRes.data as QuestionRow[] | null) ?? [];

    const questionIds = questions.map((q) => q.id);

    if (questionIds.length) {
      const rRes = await supabase
        .from("question_replies")
        .select(
          "id, question_id, user_id, body, is_official, upvotes, created_at, profiles:user_id(id, full_name, photo_url, role)"
        )
        .in("question_id", questionIds)
        .order("is_official", { ascending: false })
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: true });
      replies = (rRes.data as ReplyRow[] | null) ?? [];
    }

    if (user && questionIds.length) {
      const upRes = await supabase
        .from("question_upvotes")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", questionIds);
      myQUpvotes = (upRes.data as { question_id: string }[] | null) ?? [];
    }

    const replyIds = replies.map((r) => r.id);
    if (user && replyIds.length) {
      const ruRes = await supabase
        .from("reply_upvotes")
        .select("reply_id")
        .eq("user_id", user.id)
        .in("reply_id", replyIds);
      myRUpvotes = (ruRes.data as { reply_id: string }[] | null) ?? [];
    }

    if (user) {
      const spk = await supabase
        .from("session_speakers")
        .select("speaker_id")
        .eq("session_id", sessionId)
        .eq("speaker_id", user.id)
        .maybeSingle();
      isSpeaker = !!spk.data;

      const prof = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const r = (prof.data as { role: string | null } | null)?.role;
      isMod = r === "organizer" || r === "admin";
    }
  } catch (err) {
    // Re-throw Next's internal NOT_FOUND / REDIRECT signals — silently
    // swallowing them surfaces as the generic "Server Components render
    // error" overlay further up the tree.
    rethrowIfRedirect(err);
    // eslint-disable-next-line no-console
    console.error("[qa section] data fetch failed", err);
    // Otherwise degrade: render the QA UI in its empty state rather than
    // tearing down the whole session detail page.
  }

  return (
    <QaClient
      sessionId={sessionId}
      userId={user?.id ?? null}
      isSpeakerHere={isSpeaker}
      isModerator={isMod}
      initialQuestions={questions}
      initialReplies={replies}
      initialMyQuestionUpvotes={myQUpvotes.map((r) => r.question_id)}
      initialMyReplyUpvotes={myRUpvotes.map((r) => r.reply_id)}
    />
  );
}
