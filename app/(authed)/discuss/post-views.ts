"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Counts a post as seen once it has been at least half on screen for a
 * second (0034_post_views.sql). Each phone reports a post once; the
 * database also counts each person once, so a refresh never adds a view.
 */

const SEEN_KEY = "discuss-seen";
const DEVICE_KEY = "device-id";
const DWELL_MS = 1000;

/** Below this the count is not shown, so a new post never reads as empty. */
export const VIEWS_SHOWN_FROM = 25;

export function viewsLabel(n: number): string | null {
  if (n < VIEWS_SHOWN_FROM) return null;
  if (n < 1000) return `${n} views`;
  const k = n / 1000;
  return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k views`;
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
          if (e.isIntersecting) {
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
      { threshold: 0.5 }
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
