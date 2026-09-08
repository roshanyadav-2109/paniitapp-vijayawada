"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChatBubbleGlyph } from "./chat-icon";
import { playMessagePing } from "./notify-sound";

// Floating chat entry-point. Lives in the (authed) layout so every page
// gets it. Hides on /chat routes since we're already there.
export function ChatFab() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      // RLS limits the result to messages in conversations we participate
      // in, so neq+is is enough — no recipient column on this schema.
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .is("read_at", null);
      if (!cancelled) setUnread(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Realtime: any message insert/update may shift the unread count;
  // an INSERT from another sender also triggers a short ping.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  useEffect(() => {
    if (!userId) return;
    const recount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    const ch = supabase
      .channel(`chat-fab-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { sender_id: string; conversation_id: string };
          void recount();
          // Ping only on inbound messages, and skip if we're already viewing
          // that conversation (the chat thread plays its own behaviour).
          if (m.sender_id === userId) return;
          if (pathnameRef.current.startsWith("/chat/")) return;
          playMessagePing();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          void recount();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId]);

  // Hide on chat surfaces — the user is already there.
  if (pathname.startsWith("/chat")) return null;

  return (
    <Link
      href="/chat"
      aria-label={`Open chat${unread > 0 ? ` (${unread} unread)` : ""}`}
      className={cn(
        "fixed right-4 z-30 inline-grid size-14 place-items-center rounded-full bg-brand-800 text-white shadow-[0_18px_40px_-10px_rgba(13,9,48,0.55)] transition-all hover:scale-[1.03] hover:bg-brand-900",
        // Above the mobile bottom-nav (72px + safe area), pinned to corner
        // on desktop.
        "bottom-[88px] lg:bottom-8 lg:right-8"
      )}
    >
      <ChatBubbleGlyph className="size-6" strokeWidth={1.6} />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-iit-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
