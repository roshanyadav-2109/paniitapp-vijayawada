"use client";

import { EmptyArt } from "@/components/features/empty-art";
import { useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  created_at: string;
}

const STORAGE_KEY = "paniit-seen-announcements";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // quota / privacy mode — ignore
  }
}

export function NotificationsBell() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  // hydration-safe: start empty, hydrate from localStorage in effect
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setSeenIds(loadSeen());
  }, []);

  // Read through the app's cached feed rather than a live connection: on
  // load, when the app comes back to the front, and every thirty seconds while
  // it is on screen. Urgent notices also go out as push notifications.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/announcements");
        if (!r.ok) return;
        const data = (await r.json()) as Announcement[];
        if (!cancelled && Array.isArray(data)) setItems(data);
      } catch {
        // offline or the feed is unreachable: keep what is shown
      }
    }
    void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  // Mark all current items as seen when the sheet opens.
  // Functional setter + no seenIds in deps — avoids the render storm.
  useEffect(() => {
    if (!open || items.length === 0) return;
    setSeenIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const i of items) {
        if (!next.has(i.id)) {
          next.add(i.id);
          changed = true;
        }
      }
      if (changed) saveSeen(next);
      return changed ? next : prev;
    });
  }, [open, items]);

  const unseenCount = items.reduce(
    (acc, i) => (seenIds.has(i.id) ? acc : acc + 1),
    0
  );
  const urgent = items.find((i) => i.priority === "urgent");
  const urgentUnseen = urgent && !seenIds.has(urgent.id);

  return (
    <>
      {urgentUnseen && urgent ? (
        <div className="border-b border-iit-700 bg-iit-500 px-4 py-2 text-xs font-medium text-white">
          {urgent.title}
        </div>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={`Notifications${unseenCount > 0 ? ` (${unseenCount} unread)` : ""}`}
            className="relative inline-grid size-10 place-items-center rounded-full text-brand-800 transition-colors hover:bg-paper-deep"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/icons-v3/notification-bell.svg" alt="" width={24} height={24} className="size-6" draggable={false} />
            {unseenCount > 0 ? (
              <span
                className={cn(
                  "absolute right-1.5 top-1.5 size-2.5 rounded-full ring-2 ring-white",
                  urgentUnseen ? "bg-iit-500" : "bg-brand-800"
                )}
              />
            ) : null}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Announcements</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6 pt-2">
            {items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia className="mb-1">
                    <EmptyArt name="empty-announcements" />
                  </EmptyMedia>
                  <EmptyTitle>No announcements yet</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-md border p-3",
                      a.priority === "urgent"
                        ? "border-iit-300 bg-iit-50"
                        : a.priority === "high"
                        ? "border-amber-200 bg-amber-50"
                        : "border-rule bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-brand-900">{a.title}</div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {a.priority && a.priority !== "normal" ? (
                          <Badge
                            variant={a.priority === "urgent" ? "destructive" : "secondary"}
                            className="eyebrow"
                          >
                            {a.priority}
                          </Badge>
                        ) : null}
                        <span className="text-[10px] text-brand-900/45">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                    {a.body ? (
                      <p className="mt-1 whitespace-pre-line text-xs leading-5 text-brand-900/70">
                        {a.body}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
