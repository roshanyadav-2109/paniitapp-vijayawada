"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowLeft, Loader2 } from "@/components/icons";
import { EmptyArt } from "@/components/features/empty-art";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/send-message";
import { cn, initials } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface PeerSummary {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
}

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * How long ago, in the fewest words that still say it: "just now" for the
 * last minute, then minutes, then hours, then the date. Used for when a
 * message was read, which is a different question from when it was sent.
 */
function agoShort(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  // Past a day it is just "Seen". A date there would be read as when the
  // message was sent, and the send time is already the other half of the
  // line — "Seen 16 May | 10:24" says two different days about one message.
  return "";
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConversationView({
  me,
  meName,
  mePhoto,
  peer,
  conversationId,
  initialMessages,
}: {
  me: string;
  meName: string | null;
  mePhoto: string | null;
  peer: PeerSummary;
  conversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // "Seen just now" is a clock reading, and the server's clock is a second
  // or two from the browser's — rendered on both sides it is a hydration
  // mismatch. The relative part appears once, on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // iOS does not resize the page for its keyboard; it lays the keyboard over
  // it, so a bottom-pinned composer ends up underneath. The visual viewport
  // reports what is actually visible, keyboard and toolbars included, so the
  // shell is sized from that and the composer stays on screen.
  const shellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = shellRef.current;
    if (!vv || !el) return;
    const apply = () => {
      el.style.height = `${vv.height}px`;
      // Safari scrolls the page behind the keyboard rather than resizing it;
      // offsetTop is how far it has moved, and matching it keeps the thread
      // aligned with what the visitor can see.
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime: inbound from peer or our own message echo, plus read receipts.
  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`chat-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        async (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => {
            // Already have this persisted row.
            if (prev.some((x) => x.id === m.id)) return prev;
            // If this is the realtime echo of our own optimistic send,
            // replace the optimistic placeholder instead of appending.
            if (m.sender_id === me) {
              const idx = prev.findIndex(
                (x) => x.id.startsWith("optimistic-") && x.body === m.body
              );
              if (idx >= 0) {
                const next = prev.slice();
                next[idx] = m;
                return next;
              }
            }
            return [...prev, m];
          });
          if (m.sender_id !== me) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id)
              .is("read_at", null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((x) =>
              x.id === m.id ? { ...x, read_at: m.read_at } : x
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, me, convId]);

  function autoresize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function submit() {
    const body = draft.trim();
    if (!body || pending) return;
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: convId ?? "pending",
      sender_id: me,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    startTransition(async () => {
      const res = await sendMessage({ recipient_id: peer.id, body });
      if ("error" in res) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(body);
        return;
      }
      // If this was the first message in the conversation, fetch the new
      // conversation id so realtime can attach. Then replace optimistic
      // with the persisted row.
      if (!convId) {
        const a = me < peer.id ? me : peer.id;
        const b = me < peer.id ? peer.id : me;
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("participant_a", a)
          .eq("participant_b", b)
          .maybeSingle();
        const newId = (conv as { id: string } | null)?.id ?? null;
        if (newId) {
          setConvId(newId);
          const { data: msgs } = await supabase
            .from("messages")
            .select(
              "id, conversation_id, sender_id, body, created_at, read_at"
            )
            .eq("conversation_id", newId)
            .order("created_at", { ascending: true });
          if (msgs) setMessages(msgs as ChatMessage[]);
        }
      }
    });
  }

  // Group messages by day separator
  const grouped: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.items.push(m);
    else grouped.push({ day, items: [m] });
  }

  return (
    // The thread owns the screen. It used to sit inside the app's page
    // padding under the greeting header and above the bottom bar, which left
    // the composer below the fold — you had to scroll the page to reach the
    // box you were trying to type in. Fixed to the viewport, the list is the
    // only thing that scrolls and the composer is always where you left it.
    //
    // Height comes from the visual viewport (see the effect above), with dvh
    // as the fallback: inset-0 measures the layout viewport, which on a
    // phone includes the strip the browser's own toolbar sits over, so the
    // composer was drawn underneath it and cut in half.
    <div
      ref={shellRef}
      className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-white px-4 py-3 lg:px-5">
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="inline-grid size-9 place-items-center rounded-full text-brand-800 hover:bg-paper-deep"
        >
          <ArrowLeft className="size-4" strokeWidth={1.7} />
        </Link>
        <Avatar className="size-10 shrink-0 ring-1 ring-rule">
          {peer.photo_url ? (
            <AvatarImage src={peer.photo_url} alt={peer.full_name ?? ""} />
          ) : null}
          <AvatarFallback className="bg-paper-deep text-[12px] font-semibold text-brand-800">
            {initials(peer.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <Link
          href={`/attendees/${peer.id}`}
          className="min-w-0 flex-1 hover:opacity-85"
        >
          <p className="truncate text-[14px] font-semibold leading-tight text-brand-950">
            {peer.full_name ?? "Attendee"}
          </p>
          {peer.designation || peer.company ? (
            <p className="mt-0.5 truncate text-[11px] text-brand-900/70">
              {[peer.designation, peer.company].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </Link>
      </header>

      {/* Message list */}
      <div
        ref={scrollerRef}
        // White, not a tinted ground: with no bubbles on it, a grey field
        // behind plain text is just a block around the message by another
        // means.
        className="flex-1 overflow-y-auto bg-white px-3 py-2 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <EmptyArt name="empty-chat" className="mb-3 size-20" />
            <p className="font-display text-[15px] font-semibold text-brand-950">
              Say hello to {peer.full_name?.split(" ")[0] ?? "them"}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {grouped.map((g, gi) => (
              <li key={`g-${gi}`}>
                <div className="my-2 flex items-center gap-3">
                  <span className="h-px flex-1 bg-rule" aria-hidden />
                  <span className="text-[11px] font-medium text-brand-900/55">
                    {g.day}
                  </span>
                  <span className="h-px flex-1 bg-rule" aria-hidden />
                </div>
                {/* One column, not two. Bubbles pushed to opposite sides
                    make a phone-width thread out of half-width scraps and
                    hide who is speaking behind a colour; this reads like a
                    transcript — the same shape for both of you, name and
                    face on every message. */}
                <ul className="flex flex-col">
                  {g.items.map((m) => {
                    const mine = m.sender_id === me;
                    const name = mine
                      ? (meName ?? "You")
                      : (peer.full_name ?? "Attendee");
                    const photo = mine ? mePhoto : peer.photo_url;
                    return (
                      <li key={m.id} className="flex gap-3 px-1 py-2.5">
                        {/* Square, and tall enough to stand beside the three
                            lines it labels: name, message, and the room the
                            message leaves underneath it. */}
                        <Avatar className="size-12 shrink-0 rounded-md ring-1 ring-rule">
                          {photo ? (
                            <AvatarImage
                              src={photo}
                              alt=""
                              className="rounded-md object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="rounded-md bg-paper-deep text-[13px] font-semibold text-brand-800">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-[13.5px] font-semibold leading-tight text-brand-950">
                              {name}
                            </p>
                            {/* Said in words beside the name, rather than one
                                tick or two in a corner — and separated the
                                way the rest of the app separates a pair of
                                facts. */}
                            <span className="text-[11px] tabular-nums text-brand-900/55">
                              {!mine
                                ? timeShort(m.created_at)
                                : [
                                    m.read_at
                                      ? ["Seen", mounted ? agoShort(m.read_at) : ""]
                                          .filter(Boolean)
                                          .join(" ")
                                      : "Sent",
                                    timeShort(m.created_at),
                                  ].join(" | ")}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-6 text-brand-950">
                            {m.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-end gap-2 border-t border-rule bg-white px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:px-4 lg:py-3"
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoresize(e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          // 16px exactly. Safari zooms the page in on any input smaller than
          // that, which is why tapping the box left the whole thread blown
          // up — and with pinch-zoom disabled there was no way back.
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-rule bg-white px-3.5 py-2.5 text-[16px] leading-snug text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-rule"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label="Send"
          className="inline-grid size-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_6px_18px_-8px_rgba(37,211,102,0.6)] transition-all hover:scale-[1.03] hover:bg-[#1FBA5A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <WhatsAppSend className="size-[20px]" />
          )}
        </button>
      </form>
    </div>
  );
}

// Filled paper-plane glyph — same shape WhatsApp's send button uses.
function WhatsAppSend({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path d="M2.5 21 22 12 2.5 3 2.5 10.5 16 12 2.5 13.5z" />
    </svg>
  );
}
