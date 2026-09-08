import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  meeting_id: z.string().uuid(),
  slot: z.object({ start: z.string(), end: z.string() }),
});

interface AcceptedRow {
  id: string;
  accepted_slot: { start: string; end: string } | null;
}

interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  status: string;
  proposed_slots: unknown;
}

interface AvailabilityRow {
  slot_start: string;
  slot_end: string;
  status: "available" | "booked" | "blocked";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { meeting_id } = parsed.data;
  let slot: { start: string; end: string };
  try {
    slot = {
      start: new Date(parsed.data.slot.start).toISOString(),
      end: new Date(parsed.data.slot.end).toISOString(),
    };
  } catch {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  if (new Date(slot.start) >= new Date(slot.end)) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  const { data: meetingData } = await supabase
    .from("meetings")
    .select("id, requester_id, invitee_id, status, proposed_slots")
    .eq("id", meeting_id)
    .maybeSingle();
  const meeting = (meetingData as MeetingRow | null) ?? null;
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (meeting.invitee_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (meeting.status !== "pending")
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });

  if (!asSlotArray(meeting.proposed_slots).some((s) => s.start === slot.start && s.end === slot.end)) {
    return NextResponse.json({ error: "slot_not_proposed" }, { status: 400 });
  }

  const { data: availability, error: availErr } = await supabase
    .from("availability_slots")
    .select("slot_start, slot_end, status")
    .eq("user_id", user.id)
    .eq("slot_start", slot.start)
    .eq("status", "available")
    .maybeSingle();
  if (availErr) return NextResponse.json({ error: availErr.message }, { status: 500 });
  const available = (availability as AvailabilityRow | null) ?? null;
  if (!available || new Date(available.slot_end).toISOString() !== slot.end) {
    return NextResponse.json({ error: "slot_not_available" }, { status: 409 });
  }

  const { data: acceptedMeetings, error: acceptedErr } = await supabase
    .from("meetings")
    .select("id, accepted_slot")
    .or(
      `requester_id.eq.${meeting.requester_id},invitee_id.eq.${meeting.requester_id},requester_id.eq.${meeting.invitee_id},invitee_id.eq.${meeting.invitee_id}`
    )
    .eq("status", "accepted")
    .neq("id", meeting_id);
  if (acceptedErr) return NextResponse.json({ error: acceptedErr.message }, { status: 500 });

  const conflict = ((acceptedMeetings as AcceptedRow[] | null) ?? []).some(
    (m) =>
      m.accepted_slot &&
      new Date(slot.start) < new Date(m.accepted_slot.end) &&
      new Date(m.accepted_slot.start) < new Date(slot.end)
  );
  if (conflict) return NextResponse.json({ error: "slot_occupied" }, { status: 409 });

  // Try the Postgres RPC first (race-condition safe). Fall back to in-app logic.
  const { data: rpcData, error: rpcErr } = await supabase.rpc("accept_meeting", {
    p_meeting_id: meeting_id,
    p_slot: slot,
  });
  if (!rpcErr) {
    await markAvailabilityBooked(supabase, user.id, meeting_id, slot.start);
    return NextResponse.json({ ok: true, via: "rpc", result: rpcData });
  }

  // Fallback path.
  const { data: updated, error: updErr } = await supabase
    .from("meetings")
    .update({ status: "accepted", accepted_slot: slot })
    .eq("id", meeting_id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (updErr || !updated)
    return NextResponse.json({ error: updErr?.message ?? "race" }, { status: 409 });

  await markAvailabilityBooked(supabase, user.id, meeting_id, slot.start);

  const a = meeting.requester_id < meeting.invitee_id ? meeting.requester_id : meeting.invitee_id;
  const b = meeting.requester_id < meeting.invitee_id ? meeting.invitee_id : meeting.requester_id;
  await supabase
    .from("connections")
    .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" });

  return NextResponse.json({ ok: true, via: "fallback" });
}

function asSlotArray(value: unknown): { start: string; end: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((slot) => {
    if (
      slot &&
      typeof slot === "object" &&
      "start" in slot &&
      "end" in slot &&
      typeof (slot as { start: unknown }).start === "string" &&
      typeof (slot as { end: unknown }).end === "string"
    ) {
      try {
        return [
          {
            start: new Date((slot as { start: string }).start).toISOString(),
            end: new Date((slot as { end: string }).end).toISOString(),
          },
        ];
      } catch {
        return [];
      }
    }
    return [];
  });
}

async function markAvailabilityBooked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  meetingId: string,
  slotStart: string
) {
  await supabase
    .from("availability_slots")
    .update({ status: "booked", meeting_id: meetingId })
    .eq("user_id", userId)
    .eq("slot_start", slotStart);
}
