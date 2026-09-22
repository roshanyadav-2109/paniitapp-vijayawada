"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface RealtimeTable {
  table: string;
  /** PostgREST-style filter, e.g. `invitee_id=eq.<uuid>`. */
  filter?: string;
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
}: {
  channel: string;
  tables: RealtimeTable[];
  quietMs?: number;
}) {
  const router = useRouter();
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
      if (document.hidden) {
        missed = true;
        return;
      }
      router.refresh();
    }

    function bump() {
      if (timer) return;
      timer = setTimeout(refresh, quietMs);
    }

    function onVisibility() {
      if (!document.hidden && missed) {
        missed = false;
        router.refresh();
      }
    }

    const ch = supabase.channel(channel);
    for (const t of list) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t.table, filter: t.filter },
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
  }, [channel, spec, quietMs, router]);

  return null;
}
