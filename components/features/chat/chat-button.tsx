"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatBubbleGlyph } from "./chat-icon";
import { playMessagePing } from "./notify-sound";

/**
 * Chat entry point, in the header beside WhatsApp and the bell.
 *
 * This was a floating 56px circle pinned above the bottom nav. It followed
 * every screen down the page and sat on top of whatever was under it — on
 * the profile screen it covered the last row outright. In the header it is
 * in the one place a messages icon is looked for, and it stops covering the
 * page it floats on.
 *
 * It stays visible on /chat rather than disappearing, so the header keeps
 * the same shape from screen to screen.
 */
export function ChatButton() {
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
      .channel(`chat-button-${userId}`)
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

  return (
    <Link
      href="/chat"
      aria-label={`Open chat${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative inline-grid size-10 place-items-center rounded-full text-brand-900 transition-colors hover:bg-paper-deep/70"
    >
      <ChatBubbleGlyph className="size-[25px]" strokeWidth={1.6} />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-iit-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
