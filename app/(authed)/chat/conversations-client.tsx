"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

export interface Thread {
  peerId: string;
  peer: {
    id: string;
    full_name: string | null;
    designation: string | null;
    company: string | null;
    photo_url: string | null;
  } | null;
  lastBody: string;
  lastFromMe: boolean;
  lastAt: string;
  lastReadAt: string | null;
  unread: number;
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function ConversationsClient({
  userId,
  initialThreads,
}: {
  userId: string;
  initialThreads: Thread[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Realtime: any inbound message or conversation bump → refresh the
  // server-rendered list so threads re-sort and unread counts update.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`chat-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId, router]);

  if (initialThreads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-100 bg-white p-8 text-center">
        <p className="text-[15px] font-semibold text-brand-950">
          No conversations yet
        </p>
        <p className="mt-1 text-[12px] leading-5 text-brand-900/70">
          Open an attendee&apos;s profile and tap Chat to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {initialThreads.map((t) => (
        <li key={t.peerId}>
          <Link
            href={`/chat/${t.peerId}`}
            className="flex items-center gap-3 rounded-lg border border-brand-100 bg-white p-3 transition-colors hover:bg-brand-50/30"
          >
            <Avatar className="size-12 shrink-0 ring-1 ring-brand-100">
              {t.peer?.photo_url ? (
                <AvatarImage
                  src={t.peer.photo_url}
                  alt={t.peer?.full_name ?? ""}
                />
              ) : null}
              <AvatarFallback className="bg-brand-50 text-[13px] font-semibold text-brand-800">
                {initials(t.peer?.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-brand-950">
                  {t.peer?.full_name ?? "Attendee"}
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-brand-800/70">
                  {timeShort(t.lastAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                {t.lastFromMe ? (
                  t.lastReadAt ? (
                    <CheckCheck
                      className="size-3.5 shrink-0 text-emerald-500"
                      strokeWidth={2}
                    />
                  ) : (
                    <Check
                      className="size-3.5 shrink-0 text-brand-800/55"
                      strokeWidth={2}
                    />
                  )
                ) : null}
                <p className="min-w-0 flex-1 truncate text-[12px] text-brand-900/75">
                  {t.lastFromMe ? `You: ${t.lastBody}` : t.lastBody}
                </p>
                {t.unread > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-800 px-1 text-[10px] font-semibold text-white">
                    {t.unread > 99 ? "99+" : t.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
