"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Check,
  ChevronUp,
  Hand,
  Loader2,
  MoreHorizontal,
  Pin,
  Reply,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { anonPseudonym } from "@/lib/anon";
import { cn, initials } from "@/lib/utils";

interface MiniProfile {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  role: string | null;
}

export interface QuestionRow {
  id: string;
  session_id: string;
  user_id: string;
  question: string;
  upvotes: number;
  is_answered: boolean | null;
  // Optional columns from migrations/0003_qa_replies.sql — may be missing.
  is_anonymous?: boolean | null;
  is_pinned?: boolean | null;
  answered_by?: string | null;
  answered_at?: string | null;
  status?: "open" | "answered" | "dismissed" | "duplicate" | null;
  created_at: string;
  profiles: MiniProfile | null;
}

export interface ReplyRow {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  is_official: boolean | null;
  upvotes: number;
  created_at: string;
  profiles: MiniProfile | null;
}

type SortKey = "top" | "recent" | "mine" | "answered";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "recent", label: "Recent" },
  { id: "mine", label: "My Questions" },
  { id: "answered", label: "Answered" },
];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  sessionId: string;
  userId: string | null;
  isSpeakerHere: boolean;
  isModerator: boolean;
  initialQuestions: QuestionRow[];
  initialReplies: ReplyRow[];
  initialMyQuestionUpvotes: string[];
  initialMyReplyUpvotes: string[];
}

export function QaClient({
  sessionId,
  userId,
  isSpeakerHere,
  isModerator,
  initialQuestions,
  initialReplies,
  initialMyQuestionUpvotes,
  initialMyReplyUpvotes,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions);
  const [replies, setReplies] = useState<ReplyRow[]>(initialReplies);
  const [sort, setSort] = useState<SortKey>("top");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [myQVotes, setMyQVotes] = useState<Set<string>>(
    () => new Set(initialMyQuestionUpvotes)
  );
  const [myRVotes, setMyRVotes] = useState<Set<string>>(
    () => new Set(initialMyReplyUpvotes)
  );

  // Realtime: subscribe to questions, replies, upvotes for this session
  useEffect(() => {
    const ch = supabase
      .channel(`qa-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        () => refetchQuestions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_replies" },
        () => refetchReplies()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_upvotes" },
        () => refetchQuestions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reply_upvotes" },
        () => refetchReplies()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function refetchQuestions() {
    const { data } = await supabase
      .from("session_questions")
      .select("*, profiles:user_id(id, full_name, photo_url, role)")
      .eq("session_id", sessionId)
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setQuestions(data as unknown as QuestionRow[]);
  }

  async function refetchReplies() {
    const ids = questions.map((q) => q.id);
    if (!ids.length) return;
    const { data } = await supabase
      .from("question_replies")
      .select(
        "id, question_id, user_id, body, is_official, upvotes, created_at, profiles:user_id(id, full_name, photo_url, role)"
      )
      .in("question_id", ids)
      .order("is_official", { ascending: false })
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: true });
    if (data) setReplies(data as unknown as ReplyRow[]);
  }

  const isAnswered = (q: QuestionRow) => q.status === "answered" || q.is_answered === true;
  const isDismissed = (q: QuestionRow) => q.status === "dismissed";

  const filtered = useMemo(() => {
    const pinned = questions.filter((q) => q.is_pinned);
    const rest = questions.filter((q) => !q.is_pinned);
    const visible = (q: QuestionRow) => !isDismissed(q);
    let list: QuestionRow[];
    if (sort === "mine") {
      list = [...pinned, ...rest].filter((q) => q.user_id === userId).filter(visible);
    } else if (sort === "answered") {
      list = [...pinned, ...rest].filter(isAnswered).filter(visible);
    } else if (sort === "recent") {
      list = [
        ...pinned,
        ...rest.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
      ].filter(visible);
    } else {
      list = [...pinned, ...rest].filter(visible);
    }
    return list;
  }, [questions, sort, userId]);

  return (
    <section className="pt-3 pb-28">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            className={cn(
              "shrink-0 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              sort === s.id
                ? "border-brand-800 bg-brand-800 text-white"
                : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center px-4 text-center">
          <Hand className="h-7 w-7 text-brand-800/55" strokeWidth={1.5} />
          <h3 className="mt-3 text-[15px] font-semibold text-brand-950">
            {sort === "mine"
              ? "You haven't asked yet"
              : sort === "answered"
              ? "Nothing answered yet"
              : "Be the first to ask"}
          </h3>
          <p className="mt-1 max-w-xs text-[12px] leading-5 text-brand-900/65">
            Your question goes straight to the speakers.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              replies={replies.filter((r) => r.question_id === q.id)}
              expanded={expandedQ === q.id}
              onToggleExpand={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
              userId={userId}
              isSpeakerHere={isSpeakerHere}
              isModerator={isModerator}
              myQVotes={myQVotes}
              myRVotes={myRVotes}
              onUpvoteQ={(id, on) => upvoteQuestion(id, on, supabase, setMyQVotes)}
              onUpvoteR={(id, on) => upvoteReply(id, on, supabase, setMyRVotes)}
              onAnswered={(id, on) => setQuestionAnswered(id, on, userId, supabase)}
              onPinned={(id, on) => setQuestionPinned(id, on, supabase)}
              onDismissed={(id) => setQuestionStatus(id, "dismissed", userId, supabase)}
              onRestored={(id) => setQuestionStatus(id, "open", userId, supabase)}
            />
          ))}
        </ul>
      )}

      <AskBar sessionId={sessionId} userId={userId} supabase={supabase} />
    </section>
  );
}

async function upvoteQuestion(
  questionId: string,
  on: boolean,
  supabase: ReturnType<typeof createClient>,
  setMyQVotes: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  setMyQVotes((prev) => {
    const next = new Set(prev);
    if (on) next.add(questionId);
    else next.delete(questionId);
    return next;
  });
  if (on) {
    await supabase
      .from("question_upvotes")
      .upsert({ question_id: questionId, user_id: user.id });
  } else {
    await supabase
      .from("question_upvotes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", user.id);
  }
}

async function upvoteReply(
  replyId: string,
  on: boolean,
  supabase: ReturnType<typeof createClient>,
  setMyRVotes: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  setMyRVotes((prev) => {
    const next = new Set(prev);
    if (on) next.add(replyId);
    else next.delete(replyId);
    return next;
  });
  if (on) {
    await supabase.from("reply_upvotes").upsert({ reply_id: replyId, user_id: user.id });
  } else {
    await supabase
      .from("reply_upvotes")
      .delete()
      .eq("reply_id", replyId)
      .eq("user_id", user.id);
  }
}

async function setQuestionStatus(
  questionId: string,
  status: "open" | "answered" | "dismissed" | "duplicate",
  userId: string | null,
  supabase: ReturnType<typeof createClient>
) {
  const update: Record<string, unknown> = { status };
  if (status === "answered") {
    update.answered_by = userId;
    update.answered_at = new Date().toISOString();
  } else if (status === "open") {
    update.answered_by = null;
    update.answered_at = null;
  }
  // If 0003 hasn't run yet, only is_answered exists. Send both — Postgres
  // ignores unknown columns on this kind of UPDATE? No — it errors. So we
  // fall back to is_answered if the first update fails.
  const { error } = await supabase.from("session_questions").update(update).eq("id", questionId);
  if (error) {
    await supabase
      .from("session_questions")
      .update({ is_answered: status === "answered" })
      .eq("id", questionId);
  }
}

async function setQuestionAnswered(
  questionId: string,
  on: boolean,
  userId: string | null,
  supabase: ReturnType<typeof createClient>
) {
  // Best-effort: write the full set; fall back to is_answered only.
  const full: Record<string, unknown> = {
    is_answered: on,
    status: on ? "answered" : "open",
    answered_by: on ? userId : null,
    answered_at: on ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from("session_questions").update(full).eq("id", questionId);
  if (error) {
    await supabase
      .from("session_questions")
      .update({ is_answered: on })
      .eq("id", questionId);
  }
}

async function setQuestionPinned(
  questionId: string,
  pinned: boolean,
  supabase: ReturnType<typeof createClient>
) {
  await supabase.from("session_questions").update({ is_pinned: pinned }).eq("id", questionId);
}

function authorLabel(q: QuestionRow | ReplyRow): string {
  if ("is_anonymous" in q && q.is_anonymous) return anonPseudonym(q.user_id);
  return q.profiles?.full_name ?? "Attendee";
}

function QuestionCard({
  q,
  replies,
  expanded,
  onToggleExpand,
  userId,
  isSpeakerHere,
  isModerator,
  myQVotes,
  myRVotes,
  onUpvoteQ,
  onUpvoteR,
  onAnswered,
  onPinned,
  onDismissed,
  onRestored,
}: {
  q: QuestionRow;
  replies: ReplyRow[];
  expanded: boolean;
  onToggleExpand: () => void;
  userId: string | null;
  isSpeakerHere: boolean;
  isModerator: boolean;
  myQVotes: Set<string>;
  myRVotes: Set<string>;
  onUpvoteQ: (id: string, on: boolean) => void;
  onUpvoteR: (id: string, on: boolean) => void;
  onAnswered: (id: string, on: boolean) => void;
  onPinned: (id: string, on: boolean) => void;
  onDismissed: (id: string) => void;
  onRestored: (id: string) => void;
}) {
  const mine = q.user_id === userId;
  const upvoted = myQVotes.has(q.id);
  const author = authorLabel(q);
  const isAnswered = q.status === "answered";
  const isDismissed = q.status === "dismissed";
  const canModerate = isModerator || isSpeakerHere;
  const showAvatar = !q.is_anonymous && q.profiles?.photo_url;

  return (
    <li className="rounded-lg border border-brand-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {showAvatar ? <AvatarImage src={q.profiles!.photo_url!} alt={author} /> : null}
          <AvatarFallback className="bg-brand-50 text-brand-800">
            {q.is_anonymous ? "??" : initials(author)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-brand-950">{author}</span>
            <span className="text-brand-800/55">{timeAgo(q.created_at)} ago</span>
            {q.is_pinned ? (
              <span className="inline-flex items-center gap-0.5 text-brand-800">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            ) : null}
            {isAnswered ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-600">
                <Check className="h-3 w-3" />
                Answered
              </span>
            ) : null}
            {mine ? (
              <span className="rounded-[3px] bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[14px] font-medium leading-snug text-brand-950 whitespace-pre-line">
            {q.question}
          </p>

          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpvoteQ(q.id, !upvoted)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                upvoted
                  ? "border-brand-800 bg-brand-800 text-white"
                  : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
              )}
              aria-pressed={upvoted}
            >
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="tabular-nums">{q.upvotes}</span>
            </button>
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-white px-2 py-1 text-[11px] font-semibold text-brand-900 transition-colors hover:bg-brand-50/40"
            >
              <Reply className="h-3.5 w-3.5" strokeWidth={1.8} />
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
            {canModerate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto inline-grid h-7 w-7 place-items-center rounded-md text-brand-800/65 hover:bg-brand-50"
                    aria-label="Moderator menu"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onAnswered(q.id, !isAnswered)}>
                    <Check className="h-4 w-4" />
                    {isAnswered ? "Reopen" : "Mark as answered"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onPinned(q.id, !q.is_pinned)}>
                    <Pin className="h-4 w-4" />
                    {q.is_pinned ? "Unpin" : "Pin to top"}
                  </DropdownMenuItem>
                  {isDismissed ? (
                    <DropdownMenuItem onSelect={() => onRestored(q.id)}>
                      <Check className="h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => onDismissed(q.id)}>
                      <X className="h-4 w-4" />
                      Dismiss
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 border-l-2 border-brand-100 pl-4">
          <ul className="space-y-3">
            {replies.map((r) => (
              <li key={r.id} className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  {r.profiles?.photo_url ? (
                    <AvatarImage src={r.profiles.photo_url} alt={r.profiles.full_name ?? ""} />
                  ) : null}
                  <AvatarFallback className="bg-brand-50 text-brand-800 text-[10px]">
                    {initials(r.profiles?.full_name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-brand-950">
                      {r.profiles?.full_name ?? "Attendee"}
                    </span>
                    {r.is_official ? (
                      <BadgeCheck className="h-3.5 w-3.5 text-brand-800" aria-label="Verified" />
                    ) : null}
                    <span className="text-brand-800/55">{timeAgo(r.created_at)} ago</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-6 text-brand-900 whitespace-pre-line">
                    {r.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => onUpvoteR(r.id, !myRVotes.has(r.id))}
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors",
                      myRVotes.has(r.id)
                        ? "bg-brand-50 text-brand-800"
                        : "text-brand-800/65 hover:bg-brand-50"
                    )}
                  >
                    <ChevronUp className="h-3 w-3" />
                    <span className="tabular-nums">{r.upvotes}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <ReplyForm questionId={q.id} />
        </div>
      ) : null}
    </li>
  );
}

function ReplyForm({ questionId }: { questionId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text || text.length > 500) return;
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("question_replies")
        .insert({ question_id: questionId, user_id: user.id, body: text });
      if (!error) setBody("");
    });
  }

  return (
    <div className="mt-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder="Reply..."
        rows={2}
        className="rounded-md border-brand-100 text-sm"
      />
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-brand-800/55">
        <span className="tabular-nums">{body.length} / 500</span>
        <Button
          size="sm"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="rounded-md"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post reply"}
        </Button>
      </div>
    </div>
  );
}

function AskBar({
  sessionId,
  userId,
  supabase,
}: {
  sessionId: string;
  userId: string | null;
  supabase: ReturnType<typeof createClient>;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text || text.length > 280 || !userId) return;
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        session_id: sessionId,
        user_id: userId,
        question: text,
      };
      // is_anonymous only exists after 0003_qa_replies.sql; tolerate either schema.
      if (anon) payload.is_anonymous = true;
      let { error } = await supabase.from("session_questions").insert(payload);
      if (error && anon) {
        delete payload.is_anonymous;
        ({ error } = await supabase.from("session_questions").insert(payload));
      }
      if (!error) {
        setBody("");
        setAnon(false);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <div className="safe-bottom fixed inset-x-0 bottom-[80px] z-30 mx-auto max-w-2xl px-4 lg:bottom-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center justify-center rounded-md bg-brand-800 text-[13px] font-semibold tracking-tight text-white shadow-[0_8px_24px_-12px_rgba(13,9,48,0.5)] transition-colors hover:bg-brand-900"
        >
          Ask a question
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/55"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-t-lg border-x border-t border-brand-100 bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight text-brand-950">
                Ask a question
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-grid h-8 w-8 place-items-center rounded-md text-brand-800/65 hover:bg-brand-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 280))}
              placeholder="Type your question — speakers reply during the session."
              rows={4}
              autoFocus
              className="rounded-md border-brand-100"
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-1.5 text-brand-900">
                <input
                  type="checkbox"
                  checked={anon}
                  onChange={(e) => setAnon(e.target.checked)}
                  className="h-4 w-4 accent-brand-800"
                />
                Post anonymously
              </label>
              <span className="tabular-nums text-brand-800/55">{body.length} / 280</span>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-md">
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={pending || !body.trim() || !userId}
                className="rounded-md"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post question"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
