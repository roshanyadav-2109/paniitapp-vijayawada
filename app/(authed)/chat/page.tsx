import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { ConversationsClient, type Thread } from "./conversations-client";

export const dynamic = "force-dynamic";

interface ConversationRow {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface PeerProfile {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
}

export default async function ChatListPage() {
  let userId: string | null = null;
  let threads: Thread[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");
    userId = user.id;

    // RLS already constrains us to conversations we're a part of.
    const { data: convRows } = await supabase
      .from("conversations")
      .select("id, participant_a, participant_b, last_message_at, created_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const convs = (convRows as ConversationRow[] | null) ?? [];
    if (convs.length > 0) {
      const convIds = convs.map((c) => c.id);
      const peerIds = Array.from(
        new Set(
          convs.map((c) =>
            c.participant_a === user.id ? c.participant_b : c.participant_a
          )
        )
      );

      const [{ data: msgRows }, { data: profRows }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at, read_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("profiles")
          .select("id, full_name, designation, company, photo_url")
          .in("id", peerIds),
      ]);
      const msgs = (msgRows as MessageRow[] | null) ?? [];
      const profs = (profRows as PeerProfile[] | null) ?? [];
      const profById = new Map(profs.map((p) => [p.id, p]));

      // Aggregate per conversation.
      const byConv = new Map<
        string,
        { last: MessageRow | null; unread: number }
      >();
      for (const c of convs) byConv.set(c.id, { last: null, unread: 0 });
      for (const m of msgs) {
        const cur = byConv.get(m.conversation_id);
        if (!cur) continue;
        if (!cur.last) cur.last = m;
        if (m.sender_id !== user.id && m.read_at === null) cur.unread += 1;
      }

      threads = convs
        .map((c) => {
          const peer =
            c.participant_a === user.id ? c.participant_b : c.participant_a;
          const t = byConv.get(c.id)!;
          if (!t.last) return null;
          return {
            peerId: peer,
            peer: profById.get(peer) ?? null,
            lastBody: t.last.body,
            lastFromMe: t.last.sender_id === user.id,
            lastAt: t.last.created_at,
            lastReadAt: t.last.read_at,
            unread: t.unread,
          } satisfies Thread;
        })
        .filter((t): t is Thread => !!t)
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="mx-auto w-full max-w-2xl pt-5 lg:pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 lg:text-3xl">
          Chat
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Direct messages with attendees at the summit.
        </p>
      </header>
      <ConversationsClient userId={userId ?? ""} initialThreads={threads} />
    </div>
  );
}
