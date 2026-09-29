"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { timeIST } from "@/lib/date";

export interface MyQuestion {
  id: string;
  question: string;
  status: "open" | "answered" | "dismissed" | "duplicate" | null;
  is_answered: boolean | null;
  is_anonymous: boolean | null;
  created_at: string;
}

const MAX = 280;

/**
 * Ask the panel, and see what you asked.
 *
 * A question goes to the session's moderators and to nobody else; what
 * comes back is whether it was answered. A dismissed question still reads
 * "Sent": the moderator's reasons for leaving one out are theirs.
 */
export function QaClient({
  sessionId,
  userId,
  canModerate,
  initialMine,
}: {
  sessionId: string;
  userId: string | null;
  canModerate: boolean;
  initialMine: MyQuestion[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [mine, setMine] = useState<MyQuestion[]>(initialMine);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  // A moderator answering one of yours shows here as it happens.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`my-questions-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_questions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as MyQuestion & { session_id?: string };
          if (row.session_id && row.session_id !== sessionId) return;
          setMine((list) => {
            if (payload.eventType === "DELETE") return list.filter((q) => q.id !== row.id);
            const rest = list.filter((q) => q.id !== row.id);
            return [row, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, sessionId, userId]);

  function submit() {
    const text = body.trim();
    if (!text || text.length > MAX || !userId) return;
    setError(null);
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from("session_questions")
        .insert({ session_id: sessionId, user_id: userId, question: text, is_anonymous: anon })
        .select("id, question, status, is_answered, is_anonymous, created_at")
        .single();
      if (err || !data) {
        setError("Could not send your question. Try again.");
        return;
      }
      setMine((list) => [data as MyQuestion, ...list.filter((q) => q.id !== data.id)]);
      setBody("");
      setAnon(false);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    });
  }

  return (
    <div className="space-y-4">
      {canModerate ? (
        <Link
          href={`/moderate?session=${sessionId}`}
          className="flex h-11 w-full items-center justify-center rounded-md border border-brand-800 bg-white text-[13.5px] font-medium text-brand-800 transition-colors hover:bg-paper"
        >
          Open the questions for this session
        </Link>
      ) : null}

      {userId ? (
        <div>
          <p className="text-[13px] leading-5 text-brand-900/70">
            Your question goes to the session&rsquo;s moderator, who puts questions to the
            panel. Only they see it.
          </p>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            placeholder="Type your question for the panel"
            rows={3}
            className="mt-2.5 rounded-md border-rule text-[14px]"
          />
          <div className="mt-2 flex items-center justify-between text-[12px] text-brand-900/70">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={anon}
                onChange={(e) => setAnon(e.target.checked)}
                className="size-4 accent-brand-800"
              />
              Ask anonymously
            </label>
            <span className="tabular-nums text-brand-900/50">
              {body.length} / {MAX}
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-md bg-brand-800 text-[14px] font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send to the moderator"}
          </button>
          {sent ? (
            <p className="mt-2 text-center text-[12.5px] text-brand-900/70">
              Sent. You&rsquo;ll see here if it is answered.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-center text-[12.5px] text-iit-600">{error}</p> : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
          }
          className="flex h-11 w-full items-center justify-center rounded-md bg-brand-800 text-[14px] font-medium text-white transition-colors hover:bg-brand-900"
        >
          Log in to ask a question
        </button>
      )}

      {mine.length > 0 ? (
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-900/55">
            Your questions
          </h3>
          <ul className="mt-2 divide-y divide-rule rounded-md border border-rule bg-white">
            {mine.map((q) => {
              const answered = q.status === "answered" || q.is_answered;
              return (
                <li key={q.id} className="px-3 py-2.5">
                  <p className="text-[14px] leading-5 text-brand-950">{q.question}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11.5px] text-brand-900/55">
                    <span>{timeIST(q.created_at)}</span>
                    {q.is_anonymous ? <span>· anonymous</span> : null}
                    <span
                      className={
                        answered
                          ? "ml-auto rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                          : "ml-auto rounded-full bg-paper px-2 py-0.5 text-brand-900/70"
                      }
                    >
                      {answered ? "Answered" : "Sent to the moderator"}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
