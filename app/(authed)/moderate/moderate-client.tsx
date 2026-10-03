"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayIST, timeIST } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface ModSession {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  venue: string | null;
}

type Asker = { full_name: string | null; designation: string | null; company: string | null };

export interface ModQuestion {
  id: string;
  session_id: string;
  question: string;
  status: "open" | "answered" | "dismissed" | "duplicate" | null;
  is_answered: boolean | null;
  is_pinned: boolean | null;
  is_anonymous: boolean | null;
  created_at: string;
  profiles: Asker | Asker[] | null;
}

type Tab = "open" | "pinned" | "answered" | "dismissed";

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Waiting" },
  { key: "pinned", label: "Priority" },
  { key: "answered", label: "Answered" },
  { key: "dismissed", label: "Dismissed" },
];

function tabOf(q: ModQuestion): Tab {
  if (q.status === "answered" || q.is_answered) return "answered";
  if (q.status === "dismissed" || q.status === "duplicate") return "dismissed";
  if (q.is_pinned) return "pinned";
  return "open";
}

/** Where to open: a session with questions waiting (the one on now if it is
 *  one), else the one on now, else the next, else the first. Opening on a
 *  session with nothing in it made the page look empty when questions
 *  were waiting in another. */
function defaultSession(sessions: ModSession[], questions: ModQuestion[]): string {
  const now = Date.now();
  const waiting = new Set(
    questions.filter((q) => tabOf(q) === "open" || tabOf(q) === "pinned").map((q) => q.session_id)
  );
  const withWaiting = sessions.filter((s) => waiting.has(s.id));
  const on = (list: ModSession[]) =>
    list.find((s) => Date.parse(s.start_at) <= now && now < Date.parse(s.end_at));
  if (withWaiting.length) return (on(withWaiting) ?? withWaiting[0]).id;
  const next = sessions.find((s) => Date.parse(s.start_at) > now);
  return (on(sessions) ?? next ?? sessions[0]).id;
}

export function ModerateClient({
  sessions,
  initialQuestions,
  initialSession,
}: {
  sessions: ModSession[];
  initialQuestions: ModQuestion[];
  initialSession: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<ModQuestion[]>(initialQuestions);
  const [active, setActive] = useState<string>(initialSession ?? defaultSession(sessions, initialQuestions));
  const [tab, setTab] = useState<Tab>("open");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Everything sent to these sessions arrives as it is asked. The row has
  // no asker's name on it, so a new one is fetched once with it.
  const ids = useMemo(() => sessions.map((s) => s.id), [sessions]);
  useEffect(() => {
    const ch = supabase
      .channel("moderate")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_questions", filter: `session_id=in.(${ids.join(",")})` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const gone = (payload.old as { id: string }).id;
            setQuestions((list) => list.filter((q) => q.id !== gone));
            return;
          }
          const row = payload.new as ModQuestion;
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("session_questions")
              .select(
                "id, session_id, question, status, is_answered, is_pinned, is_anonymous, created_at, profiles:user_id(full_name, designation, company)"
              )
              .eq("id", row.id)
              .maybeSingle();
            const full = (data as unknown as ModQuestion | null) ?? { ...row, profiles: null };
            setQuestions((list) => [full, ...list.filter((q) => q.id !== row.id)]);
            setFresh((s) => new Set(s).add(row.id));
            return;
          }
          setQuestions((list) =>
            list.map((q) => (q.id === row.id ? { ...q, ...row, profiles: q.profiles } : q))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, ids]);

  const inSession = questions.filter((q) => q.session_id === active);
  const counts = TABS.reduce(
    (acc, t) => ({ ...acc, [t.key]: inSession.filter((q) => tabOf(q) === t.key).length }),
    {} as Record<Tab, number>
  );
  const shown = inSession
    .filter((q) => tabOf(q) === tab)
    .sort((a, b) =>
      tab === "open" || tab === "pinned"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)
    );
  const waitingBySession = (id: string) =>
    questions.filter((q) => q.session_id === id && (tabOf(q) === "open" || tabOf(q) === "pinned")).length;

  async function update(q: ModQuestion, patch: Partial<ModQuestion>) {
    setError(null);
    const before = questions;
    setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
    const { profiles: _ignore, ...fields } = { ...patch, profiles: null };
    void _ignore;
    const { error: err } = await supabase.from("session_questions").update(fields).eq("id", q.id);
    if (err) {
      setQuestions(before);
      setError("That did not save. Try again.");
    }
  }

  const answered = { status: "answered" as const, is_answered: true, is_pinned: false };
  const dismissed = { status: "dismissed" as const, is_answered: false, is_pinned: false };
  const reopened = { status: "open" as const, is_answered: false, is_pinned: false };

  return (
    <div className="mt-5">
      {/* The sessions, with how many questions wait in each. */}
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {sessions.map((s) => {
          const waiting = waitingBySession(s.id);
          const on = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={cn(
                "flex min-w-[210px] max-w-[260px] shrink-0 flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                on ? "border-brand-800 bg-brand-800 text-white" : "border-rule bg-white text-brand-950 hover:bg-paper"
              )}
            >
              <span className="line-clamp-2 text-[13px] font-medium leading-snug">{s.title}</span>
              <span className={cn("mt-1 flex items-center gap-2 text-[11.5px]", on ? "text-white/75" : "text-brand-900/55")}>
                {dayIST(s.start_at)} · {timeIST(s.start_at)}
                {waiting > 0 ? (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                      on ? "bg-white text-brand-800" : "bg-iit-500 text-white"
                    )}
                  >
                    {waiting}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Four tabs do not fit one phone row with their counts: they scroll
          sideways instead, each as wide as its own words. */}
      <div className="no-scrollbar -mx-3 mt-4 flex gap-1.5 overflow-x-auto px-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors",
              tab === t.key ? "bg-brand-900 font-medium text-white" : "bg-white text-brand-900 ring-1 ring-rule hover:bg-paper"
            )}
          >
            {t.label}
            {counts[t.key] ? <span className="tabular-nums opacity-70">{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-center text-[12.5px] text-iit-600">{error}</p> : null}

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-[13.5px] text-brand-900/60">
          {tab === "open" ? "No questions waiting. New ones appear here as they are sent." : "Nothing here."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((q) => {
            const who = Array.isArray(q.profiles) ? q.profiles[0] : q.profiles;
            const line = [who?.designation, who?.company].filter(Boolean).join(", ");
            const t = tabOf(q);
            return (
              <li
                key={q.id}
                onClick={() => setFresh((s) => { const n = new Set(s); n.delete(q.id); return n; })}
                className={cn(
                  "rounded-lg border bg-white p-3.5 transition-colors",
                  fresh.has(q.id) ? "border-iit-300 bg-iit-50/40" : "border-rule"
                )}
              >
                <p className="text-[15px] leading-6 text-brand-950">{q.question}</p>
                <p className="mt-1.5 text-[12px] text-brand-900/60">
                  {q.is_anonymous ? "Anonymous" : who?.full_name ?? "An attendee"}
                  {!q.is_anonymous && line ? ` · ${line}` : ""} · {timeIST(q.created_at)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t === "open" ? (
                    <ActionButton onClick={() => update(q, { is_pinned: true })}>Mark priority</ActionButton>
                  ) : null}
                  {t === "open" || t === "pinned" ? (
                    <>
                      <ActionButton strong onClick={() => update(q, answered)}>
                        Answered
                      </ActionButton>
                      <ActionButton onClick={() => update(q, dismissed)}>Dismiss</ActionButton>
                    </>
                  ) : null}
                  {t === "pinned" ? (
                    <ActionButton onClick={() => update(q, { is_pinned: false })}>Back to waiting</ActionButton>
                  ) : null}
                  {t === "answered" || t === "dismissed" ? (
                    <ActionButton onClick={() => update(q, reopened)}>Reopen</ActionButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  strong = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  strong?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "h-9 rounded-md px-3.5 text-[13px] transition-colors",
        strong ? "bg-brand-800 font-medium text-white hover:bg-brand-900" : "border border-rule bg-white text-brand-900 hover:bg-paper"
      )}
    >
      {children}
    </button>
  );
}
