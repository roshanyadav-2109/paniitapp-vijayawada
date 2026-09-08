"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function ChatWindow({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, read_at, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[] | null) ?? []);
    })();
  }, [supabase, conversationId]);

  useEffect(() => {
    const ch = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Message;
              if (prev.some((m) => m.id === next.id)) return prev;
              return [...prev, next];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Message;
              return prev.map((m) => (m.id === next.id ? next : m));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((m) => m.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, conversationId]);

  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id !== userId && !m.read_at);
    if (unread.length === 0) return;
    (async () => {
      const ids = unread.map((m) => m.id);
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
    })();
  }, [messages, userId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    const text = body.trim();
    if (!text || text.length > 2000) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: userId, body: text });
      if (!error) setBody("");
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No messages yet. Say hi.</div>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm leading-6",
                  mine ? "bg-brand-800 text-white" : "bg-slate-100 text-slate-900"
                )}
              >
                <div className="whitespace-pre-line">{m.body}</div>
                {mine && m.read_at ? (
                  <div className="mt-0.5 text-right text-[10px] text-white/60">Read</div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 bg-white px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !body.trim()}
            className="inline-grid h-10 w-10 place-items-center rounded-md bg-brand-800 text-white transition-colors hover:bg-brand-900 disabled:opacity-60"
            aria-label="Send"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
