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
import { ArrowLeft, Check, CheckCheck, Loader2 } from "lucide-react";
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
  peer,
  conversationId,
  initialMessages,
}: {
  me: string;
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
    <div className="-mx-4 flex h-[calc(100svh-3.5rem-72px)] flex-col bg-white sm:-mx-6 lg:mx-auto lg:h-[calc(100vh-7rem)] lg:max-w-3xl lg:rounded-lg lg:border lg:border-brand-100">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-brand-100 bg-white px-4 py-3 lg:px-5">
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="inline-grid size-9 place-items-center rounded-full text-brand-800 hover:bg-brand-50"
        >
          <ArrowLeft className="size-4" strokeWidth={1.7} />
        </Link>
        <Avatar className="size-10 shrink-0 ring-1 ring-brand-100">
          {peer.photo_url ? (
            <AvatarImage src={peer.photo_url} alt={peer.full_name ?? ""} />
          ) : null}
          <AvatarFallback className="bg-brand-50 text-[12px] font-semibold text-brand-800">
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
              {[peer.designation, peer.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </Link>
      </header>

      {/* Message list */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto bg-brand-50/40 px-3 py-3 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[14px] font-semibold text-brand-950">
              Say hello to {peer.full_name?.split(" ")[0] ?? "them"}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-brand-900/65">
              Your messages stay between the two of you.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {grouped.map((g, gi) => (
              <li key={`g-${gi}`}>
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800/70 ring-1 ring-brand-100">
                    {g.day}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {g.items.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "flex w-full",
                        m.sender_id === me ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-[0_1px_0_0_rgba(13,9,48,0.04)]",
                          m.sender_id === me
                            ? "rounded-br-md bg-brand-800 text-white"
                            : "rounded-bl-md bg-white text-brand-950 ring-1 ring-brand-100"
                        )}
                      >
                        <p className="whitespace-pre-line break-words">
                          {m.body}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 pr-0.5 text-[10px]",
                            m.sender_id === me
                              ? "text-white/65"
                              : "text-brand-800/55"
                          )}
                        >
                          <span className="tabular-nums">
                            {timeShort(m.created_at)}
                          </span>
                          {m.sender_id === me ? (
                            m.read_at ? (
                              <CheckCheck
                                className="size-[14px] shrink-0 text-emerald-300"
                                strokeWidth={2}
                              />
                            ) : (
                              <Check
                                className="size-[14px] shrink-0"
                                strokeWidth={2}
                              />
                            )
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
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
        className="safe-bottom flex items-end gap-2 border-t border-brand-100 bg-white px-3 py-2 lg:px-4 lg:py-3"
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
          className="min-h-[40px] flex-1 resize-none rounded-2xl border border-brand-100 bg-white px-3.5 py-2 text-[14px] leading-snug text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
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
