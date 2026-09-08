import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import {
  ConversationView,
  type ChatMessage,
  type PeerSummary,
} from "./conversation-client";

export const dynamic = "force-dynamic";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: peerId } = await params;
  let me: string | null = null;
  let conversationId: string | null = null;
  let peer: PeerSummary | null = null;
  let messages: ChatMessage[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");
    me = user.id;
    if (me === peerId) notFound();

    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, designation, company, photo_url")
      .eq("id", peerId)
      .maybeSingle();
    peer = (p as PeerSummary | null) ?? null;
    if (!peer) notFound();

    const a = me < peerId ? me : peerId;
    const b = me < peerId ? peerId : me;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", a)
      .eq("participant_b", b)
      .maybeSingle();
    conversationId = (conv as { id: string } | null)?.id ?? null;

    if (conversationId) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500);
      messages = (msgs as ChatMessage[] | null) ?? [];

      // Mark unread incoming messages as seen.
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", me)
        .is("read_at", null);
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  if (!peer) notFound();

  return (
    <ConversationView
      me={me!}
      peer={peer}
      conversationId={conversationId}
      initialMessages={messages}
    />
  );
}
