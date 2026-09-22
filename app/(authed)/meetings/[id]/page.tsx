import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/features/realtime-refresh";
import {
  ConversationView,
  type ChatMessage,
  type PeerSummary,
} from "@/app/(authed)/chat/[userId]/conversation-client";

interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  accepted_slot: { start: string; end: string } | null;
  location: string | null;
  status: string;
  proposed_outside_availability: boolean | null;
  requester: PeerSummary | null;
  invitee: PeerSummary | null;
}

export const dynamic = "force-dynamic";

/**
 * The meeting's chat is the same conversation as the one in Chat — same two
 * people, same table, same row — so it is now the same screen, rather than a
 * second transcript with its own bubbles under a header repeating a name the
 * transcript already shows.
 */
export default async function MeetingChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data } = await supabase
    .from("meetings")
    .select(
      "id, requester_id, invitee_id, accepted_slot, location, status, proposed_outside_availability, requester:requester_id(id, full_name, photo_url, designation, company), invitee:invitee_id(id, full_name, photo_url, designation, company)"
    )
    .eq("id", id)
    .maybeSingle();
  const meeting = (data as unknown as MeetingRow | null) ?? null;
  if (!meeting) notFound();
  if (meeting.requester_id !== user.id && meeting.invitee_id !== user.id) notFound();

  // Find or create the canonical 1:1 conversation between these two
  // participants. The conversations table has no meeting_id; it pairs
  // participants directly, which is why this is the same row Chat opens.
  const a =
    meeting.requester_id < meeting.invitee_id ? meeting.requester_id : meeting.invitee_id;
  const b =
    meeting.requester_id < meeting.invitee_id ? meeting.invitee_id : meeting.requester_id;

  // The database is a long way from the function, so the two reads that do
  // not depend on each other go together.
  const [{ data: existing }, { data: mine }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", a)
      .eq("participant_b", b)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  let conversationId: string | null = (existing as { id: string } | null)?.id ?? null;
  if (!conversationId && meeting.status === "accepted") {
    const { data: created } = await supabase
      .from("conversations")
      .insert({ participant_a: a, participant_b: b })
      .select("id")
      .maybeSingle();
    conversationId = (created as { id: string } | null)?.id ?? null;
  }

  const meProfile =
    (mine as { id: string; full_name: string | null; photo_url: string | null } | null) ??
    null;
  const peer = meeting.requester_id === user.id ? meeting.invitee : meeting.requester;
  if (!peer) notFound();

  let messages: ChatMessage[] = [];
  if (conversationId) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    messages = (msgs as ChatMessage[] | null) ?? [];

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  }

  if (!conversationId) {
    return (
      <div className="flex h-[calc(100vh-8.5rem)] flex-col">
        <RealtimeRefresh
          channel={`meeting-${meeting.id}`}
          tables={[{ table: "meetings", filter: `id=eq.${meeting.id}` }]}
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/meetings"
            aria-label="Back"
            className="inline-grid size-9 place-items-center rounded-full text-brand-800 hover:bg-paper-deep"
          >
            <ArrowLeft className="size-4" strokeWidth={1.7} />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-brand-900/60">
          Chat opens once the meeting is accepted.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* The messages have always been live; the meeting itself was not, so
          an accept or a cancel by the other side left this screen stale. */}
      <RealtimeRefresh
        channel={`meeting-${meeting.id}`}
        tables={[{ table: "meetings", filter: `id=eq.${meeting.id}` }]}
      />
      <ConversationView
        me={user.id}
        meName={meProfile?.full_name ?? null}
        mePhoto={meProfile?.photo_url ?? null}
        peer={peer}
        conversationId={conversationId}
        initialMessages={messages}
        backHref="/meetings"
      />
    </>
  );
}
