import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const SlotSchema = z.object({ start: z.string(), end: z.string() });
const Body = z.object({
  meeting_id: z.string().uuid(),
  proposed_slots: z.array(SlotSchema).min(1).max(3),
});

interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  status: string;
  accepted_slot: unknown;
}

interface AvailabilityRow {
  slot_start: string;
  slot_end: string;
  status: "available" | "booked" | "blocked";
}

interface AcceptedRow {
  accepted_slot: { start: string; end: string } | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  let proposed: { start: string; end: string }[];
  try {
    proposed = parsed.data.proposed_slots.map((slot) => ({
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
    }));
  } catch {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  if (new Set(proposed.map((slot) => slot.start)).size !== proposed.length) {
    return NextResponse.json({ error: "duplicate_slots" }, { status: 400 });
  }
  if (proposed.some((slot) => new Date(slot.start) >= new Date(slot.end))) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("meetings")
    .select("id, requester_id, invitee_id, status, accepted_slot")
    .eq("id", parsed.data.meeting_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meeting = (data as MeetingRow | null) ?? null;
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (meeting.requester_id !== user.id && meeting.invitee_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (meeting.status !== "accepted") {
    return NextResponse.json({ error: "not_accepted" }, { status: 409 });
  }

  const nextInviteeId = meeting.requester_id === user.id ? meeting.invitee_id : meeting.requester_id;

  const { data: availability, error: availErr } = await admin
    .from("availability_slots")
    .select("slot_start, slot_end, status")
    .eq("user_id", nextInviteeId);
  if (availErr) return NextResponse.json({ error: availErr.message }, { status: 500 });

  const availRows = (availability as AvailabilityRow[] | null) ?? [];
  const inviteeHasSetAvailability = availRows.length > 0;
  const proposedOutsideAvailability = !inviteeHasSetAvailability;

  if (inviteeHasSetAvailability) {
    const available = new Map(
      availRows
        .filter((row) => row.status === "available")
        .map((row) => [
          new Date(row.slot_start).toISOString(),
          new Date(row.slot_end).toISOString(),
        ])
    );
    if (!proposed.every((slot) => available.get(slot.start) === slot.end)) {
      return NextResponse.json({ error: "slot_not_available" }, { status: 409 });
    }
  }

  const { data: acceptedMeetings, error: acceptedErr } = await admin
    .from("meetings")
    .select("accepted_slot")
    .or(
      `requester_id.eq.${user.id},invitee_id.eq.${user.id},requester_id.eq.${nextInviteeId},invitee_id.eq.${nextInviteeId}`
    )
    .eq("status", "accepted")
    .neq("id", meeting.id);
  if (acceptedErr) return NextResponse.json({ error: acceptedErr.message }, { status: 500 });

  const hasAcceptedConflict = proposed.some((slot) =>
    ((acceptedMeetings as AcceptedRow[] | null) ?? []).some(
      (m) =>
        m.accepted_slot &&
        new Date(slot.start) < new Date(m.accepted_slot.end) &&
        new Date(m.accepted_slot.start) < new Date(slot.end)
    )
  );
  if (hasAcceptedConflict) {
    return NextResponse.json({ error: "slot_occupied" }, { status: 409 });
  }

  const accepted = asSlot(meeting.accepted_slot);
  if (accepted) {
    const { error: releaseErr } = await admin
      .from("availability_slots")
      .update({ status: "available", meeting_id: null })
      .eq("user_id", meeting.invitee_id)
      .eq("slot_start", accepted.start)
      .eq("status", "booked");
    if (releaseErr) return NextResponse.json({ error: releaseErr.message }, { status: 500 });
  }

  const { error: updErr } = await admin
    .from("meetings")
    .update({
      requester_id: user.id,
      invitee_id: nextInviteeId,
      proposed_slots: proposed,
      accepted_slot: null,
      status: "pending",
      proposed_outside_availability: proposedOutsideAvailability,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meeting.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

function asSlot(value: unknown): { start: string; end: string } | null {
  if (
    value &&
    typeof value === "object" &&
    "start" in value &&
    "end" in value &&
    typeof (value as { start: unknown }).start === "string" &&
    typeof (value as { end: unknown }).end === "string"
  ) {
    try {
      return {
        start: new Date((value as { start: string }).start).toISOString(),
        end: new Date((value as { end: string }).end).toISOString(),
      };
    } catch {
      return null;
    }
  }
  return null;
}
