"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

function PremiumBell({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        d="M5.45 16.45A1 1 0 006.27 18h11.46a1 1 0 00.82-1.57l-1.05-1.5A4 4 0 0116.8 12.6V9.5a4.8 4.8 0 10-9.6 0v3.1a4 4 0 01-.7 2.26l-1.05 1.59z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 19.5a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = useMemo(() => createClient(), []);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setItems((data as Announcement[] | null) ?? []);
    })();

    const ch = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const row = payload.new as Announcement;
          setItems((prev) => [row, ...prev].slice(0, 20));
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [supabase]);

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
            className="relative inline-grid size-10 place-items-center rounded-full text-brand-800 transition-colors hover:bg-brand-50"
          >
            <PremiumBell className="size-[22px]" />
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
                  <EmptyMedia variant="icon">
                    <Bell />
                  </EmptyMedia>
                  <EmptyTitle>No announcements yet</EmptyTitle>
                  <EmptyDescription>
                    Organizers will post updates here during the summit.
                  </EmptyDescription>
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
                        : "border-slate-200 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-brand-900">{a.title}</div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {a.priority && a.priority !== "normal" ? (
                          <Badge
                            variant={a.priority === "urgent" ? "destructive" : "secondary"}
                            className="text-[10px] uppercase tracking-wider"
                          >
                            {a.priority}
                          </Badge>
                        ) : null}
                        <span className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                    {a.body ? (
                      <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">
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
