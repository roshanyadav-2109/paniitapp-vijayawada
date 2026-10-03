"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Reactions on posts and replies (0033_reactions.sql).
 *
 * A short, professional set: nothing that laughs. One reaction per person
 * per post or reply; choosing another replaces it, choosing the same one
 * again takes it back. "Agree" is the old tick, carried over.
 */
export const REACTIONS = [
  { key: "agree", emoji: "👍", label: "Agree" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "applause", emoji: "👏", label: "Applause" },
  { key: "praise", emoji: "🙌", label: "Praise" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];
const BY_KEY = Object.fromEntries(REACTIONS.map((r) => [r.key, r])) as Record<
  ReactionKey,
  (typeof REACTIONS)[number]
>;

type Counts = Partial<Record<ReactionKey, number>>;
export type Reactions = {
  counts: Record<string, Counts>;
  mine: Record<string, ReactionKey | undefined>;
  react: (id: string, key: ReactionKey) => void;
};

const TABLE = {
  post: { table: "post_reactions", col: "post_id" },
  comment: { table: "comment_reactions", col: "comment_id" },
} as const;

/** Counts and the viewer's own reaction for a list of posts or replies. */
export function useReactions(kind: "post" | "comment", ids: string[], userId: string | null): Reactions {
  const supabase = useMemo(() => createClient(), []);
  const { table, col } = TABLE[kind];
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [mine, setMine] = useState<Record<string, ReactionKey | undefined>>({});
  const key = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from(table).select(`${col}, user_id, reaction`).in(col, ids);
      if (cancelled || !data) return;
      const c: Record<string, Counts> = {};
      const m: Record<string, ReactionKey | undefined> = {};
      for (const row of data as Record<string, string>[]) {
        const id = row[col];
        const r = row.reaction as ReactionKey;
        (c[id] ??= {})[r] = (c[id][r] ?? 0) + 1;
        if (userId && row.user_id === userId) m[id] = r;
      }
      setCounts(c);
      setMine(m);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, supabase, table, col]);

  const react = useCallback(
    (id: string, r: ReactionKey) => {
      if (!userId) {
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const before = mine[id];
      const next = before === r ? undefined : r;
      const prevCounts = counts[id] ?? {};
      const bumped: Counts = { ...prevCounts };
      if (before) bumped[before] = Math.max(0, (bumped[before] ?? 0) - 1);
      if (next) bumped[next] = (bumped[next] ?? 0) + 1;
      setMine((m) => ({ ...m, [id]: next }));
      setCounts((c) => ({ ...c, [id]: bumped }));

      void (async () => {
        const { error } = next
          ? await supabase
              .from(table)
              .upsert({ [col]: id, user_id: userId, reaction: next }, { onConflict: `${col},user_id` })
          : await supabase.from(table).delete().eq(col, id).eq("user_id", userId);
        if (error) {
          setMine((m) => ({ ...m, [id]: before }));
          setCounts((c) => ({ ...c, [id]: prevCounts }));
          toast({ title: "Could not save your reaction", description: "Check your connection and try again." });
        }
      })();
    },
    [userId, mine, counts, supabase, table, col]
  );

  return { counts, mine, react };
}

/**
 * The reaction button with the tally beside it. Tapping opens the five
 * choices in a row; the row closes on a choice, a tap elsewhere or Escape.
 */
export function ReactionBar({
  id,
  reactions,
  compact = false,
}: {
  id: string;
  reactions: Reactions;
  /** Smaller, for replies. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const mine = reactions.mine[id];
  const counts = reactions.counts[id] ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const top = (Object.entries(counts) as [ReactionKey, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const chosen = mine ? BY_KEY[mine] : null;

  return (
    <div ref={wrap} className="relative inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
          compact ? "h-6 px-1.5 text-[11px]" : "h-8 px-2 text-[12px]",
          chosen ? "text-brand-800" : "text-brand-900/55 hover:bg-paper-deep"
        )}
      >
        <span className={cn(compact ? "text-[13px]" : "text-[15px]", "leading-none", !chosen && "opacity-60 grayscale")}>
          {chosen ? chosen.emoji : "👍"}
        </span>
        {chosen ? chosen.label : "React"}
      </button>

      {total > 0 ? (
        <span
          className={cn("inline-flex items-center gap-1 text-brand-900/60", compact ? "text-[11px]" : "text-[12px]")}
          aria-label={top.map(([k, n]) => `${n} ${BY_KEY[k].label}`).join(", ")}
        >
          <span className="inline-flex leading-none">
            {top.map(([k]) => (
              <span key={k} className={cn(compact ? "text-[12px]" : "text-[14px]", "-mr-0.5")}>
                {BY_KEY[k].emoji}
              </span>
            ))}
          </span>
          <span className="tabular-nums">{total}</span>
        </span>
      ) : null}

      {open ? (
        <div
          role="menu"
          aria-label="Choose a reaction"
          className="absolute bottom-full left-0 z-30 mb-1.5 flex items-stretch gap-0.5 rounded-lg border border-rule bg-white p-1"
        >
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="menuitemradio"
              aria-checked={mine === r.key}
              aria-label={r.label}
              onClick={() => {
                reactions.react(id, r.key);
                setOpen(false);
              }}
              className={cn(
                "flex w-14 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors hover:bg-paper-deep",
                mine === r.key && "bg-brand-50"
              )}
            >
              <span className="text-[22px] leading-none">{r.emoji}</span>
              <span className="text-[10px] font-medium text-brand-900/70">{r.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
