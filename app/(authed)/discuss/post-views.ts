"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Counts a post as seen once at least half of it, or for a tall post a good
 * part of the screen, has been in view for a moment (0034_post_views.sql). Each phone reports a post once; the
 * database also counts each person once, so a refresh never adds a view.
 */

const SEEN_KEY = "discuss-seen";
const DEVICE_KEY = "device-id";
// Long enough that a post flicked past is not counted, short enough that
// someone reading at a normal scroll is.
const DWELL_MS = 600;

/** The compact number shown beside every post's view icon. */
export function viewsLabel(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function deviceId(): string {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Returns a ref callback to put on each post's root element. */
export function usePostViews() {
  const observer = useRef<IntersectionObserver | null>(null);
  const timers = useRef(new Map<string, number>());
  const pending = useRef(new Set<string>());
  const seen = useRef<Set<string> | null>(null);
  // Every post handed over, so a new observer can pick them all up again.
  const els = useRef(new Set<HTMLElement>());

  const flush = useCallback(() => {
    if (pending.current.size === 0) return;
    const ids = [...pending.current];
    pending.current.clear();
    void createClient()
      .rpc("record_post_views", { post_ids: ids, device: deviceId() })
      .then(({ error }) => {
        if (error) return; // no signal: they will be counted next visit
        const s = seen.current ?? readSeen();
        ids.forEach((id) => s.add(id));
        try {
          window.localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500)));
        } catch {
          /* storage blocked: the database still counts each person once */
        }
      });
  }, []);

  // Made on first use: the posts attach before this hook's effect runs.
  const ensure = useCallback(() => {
    if (observer.current || typeof IntersectionObserver === "undefined") return observer.current;
    seen.current ??= readSeen();
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.postId;
          if (!id || seen.current?.has(id)) continue;
          // Half the post on screen, or, for a post taller than the screen
          // (a big photo), a good part of the screen filled by it.
          const seenEnough =
            e.isIntersecting &&
            (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.4);
          if (seenEnough) {
            if (!timers.current.has(id)) {
              timers.current.set(
                id,
                window.setTimeout(() => {
                  timers.current.delete(id);
                  seen.current?.add(id);
                  pending.current.add(id);
                }, DWELL_MS)
              );
            }
          } else {
            const t = timers.current.get(id);
            if (t) window.clearTimeout(t);
            timers.current.delete(id);
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.current.forEach((el) => observer.current?.observe(el));
    return observer.current;
  }, []);

  useEffect(() => {
    ensure();
    const tick = window.setInterval(flush, 2500);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    const pendingTimers = timers.current;
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
      pendingTimers.forEach((t) => window.clearTimeout(t));
      flush();
    };
  }, [flush, ensure]);

  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      els.current.add(el);
      ensure()?.observe(el);
    },
    [ensure]
  );
}
