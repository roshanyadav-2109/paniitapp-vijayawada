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

  // The unread count is asked for, not listened for: when the app comes to
  // the front, on every change of screen, and each minute while it is on
  // screen. A live subscription here put every signed-in phone on every
  // message anyone sent, and made each of them recount on each one.
  // A rise in the count away from the chat plays the ping.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const lastRef = useRef<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const recount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      if (cancelled || count == null) return;
      const before = lastRef.current;
      lastRef.current = count;
      setUnread(count);
      if (before != null && count > before && !pathnameRef.current.startsWith("/chat")) {
        playMessagePing();
      }
    };
    void recount();
    const onVisible = () => {
      if (!document.hidden) void recount();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (!document.hidden) void recount();
    }, 60_000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [supabase, userId, pathname]);

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
