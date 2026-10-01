"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface RealtimeTable {
  table: string;
  /** PostgREST-style filter, e.g. `invitee_id=eq.<uuid>`. */
  filter?: string;
  /** Which changes count; every kind unless set. */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
}

/**
 * Listens to a few tables and re-renders the server component that mounted
 * it when any of them change.
 *
 * Screens here are server-rendered and then refreshed after your own
 * actions, which leaves everyone else's out: a post, a comment, a meeting
 * request sat unseen until you navigated. This is the smallest thing that
 * fixes that — no local cache to keep in step with the server's version of
 * the row, just "something moved, ask again".
 *
 * Two economies, because the feed can move in bursts:
 *  - a burst is one refresh, not one per row;
 *  - a hidden tab does not refresh at all, it remembers and catches up when
 *    you come back to it.
 */
export function RealtimeRefresh({
  channel,
  tables,
  quietMs = 800,
  jitterMs = 0,
  prompt,
}: {
  channel: string;
  tables: RealtimeTable[];
  quietMs?: number;
  /** Up to this much more wait, different on each phone, so a change does
   *  not send every open copy of the screen back to the server at once. */
  jitterMs?: number;
  /** When set, a change shows this as a button instead of refreshing on its
   *  own, and the screen refreshes for whoever taps it. On a feed hundreds
   *  of people have open, refreshing them all on every change sent one
   *  server render per viewer per change. */
  prompt?: string;
}) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  // The parent rebuilds this array on every render, so the effect keys off
  // what is in it rather than its identity — otherwise the subscription is
  // torn down and rebuilt each time.
  const spec = JSON.stringify(tables);

  useEffect(() => {
    const list = JSON.parse(spec) as RealtimeTable[];
    if (list.length === 0) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let missed = false;

    function refresh() {
      timer = null;
      if (prompt) {
        setWaiting(true);
        return;
      }
      if (document.hidden) {
        missed = true;
        return;
      }
      router.refresh();
    }

    function bump() {
      if (timer) return;
      timer = setTimeout(refresh, quietMs + Math.random() * jitterMs);
    }

    function onVisibility() {
      if (!document.hidden && missed) {
        missed = false;
        if (prompt) setWaiting(true);
        else router.refresh();
      }
    }

    const ch = supabase.channel(channel);
    for (const t of list) {
      ch.on(
        "postgres_changes",
        { event: t.event ?? "*", schema: "public", table: t.table, filter: t.filter },
        bump
      );
    }
    ch.subscribe();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [channel, spec, quietMs, jitterMs, router, prompt]);

  if (!prompt || !waiting) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setWaiting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      }}
      className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-brand-800 px-4 py-2 text-[13px] font-medium text-white shadow-lg"
    >
      {prompt}
    </button>
  );
}
