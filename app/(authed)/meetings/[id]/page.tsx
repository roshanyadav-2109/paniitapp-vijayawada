import { notFound } from "next/navigation";
import { CalendarOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "./chat-window";

interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  accepted_slot: { start: string; end: string } | null;
  location: string | null;
  status: string;
  proposed_outside_availability: boolean | null;
  requester: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    designation: string | null;
    company: string | null;
  } | null;
  invitee: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    designation: string | null;
    company: string | null;
  } | null;
}

export const dynamic = "force-dynamic";

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

  // Find or create the canonical 1:1 conversation between these two participants.
  // The conversations table doesn't have a meeting_id; it pairs participants directly.
  const a =
    meeting.requester_id < meeting.invitee_id ? meeting.requester_id : meeting.invitee_id;
  const b =
    meeting.requester_id < meeting.invitee_id ? meeting.invitee_id : meeting.requester_id;

  let conversationId: string | null = null;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();
  if (existing?.id) {
    conversationId = existing.id;
  } else if (meeting.status === "accepted") {
    const { data: created } = await supabase
      .from("conversations")
      .insert({ participant_a: a, participant_b: b })
      .select("id")
      .maybeSingle();
    conversationId = created?.id ?? null;
  }

  const other = meeting.requester_id === user.id ? meeting.invitee : meeting.requester;
  const viewerIsRequester = meeting.requester_id === user.id;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-brand-900">
            {other?.full_name ?? "Conversation"}
          </h1>
          <p className="text-xs text-slate-500">
            {[other?.designation, other?.company].filter(Boolean).join(" · ") || " "}
          </p>
          {meeting.proposed_outside_availability ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <CalendarOff className="size-3" strokeWidth={2} />
              {viewerIsRequester
                ? "Proposed outside their availability"
                : "Proposed outside your availability"}
            </div>
          ) : null}
        </div>
      </header>

      {conversationId ? (
        <ChatWindow conversationId={conversationId} userId={user.id} />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
          Chat opens once the meeting is accepted.
        </div>
      )}
    </div>
  );
}
