import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const Body = z.object({ meeting_id: z.string().uuid() });

interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  status: string;
  accepted_slot: unknown;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

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
  if (meeting.status !== "accepted" && meeting.status !== "pending") {
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  }

  const { error: updErr } = await admin
    .from("meetings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", meeting.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const accepted = asSlot(meeting.accepted_slot);
  if (accepted) {
    const { error: availErr } = await admin
      .from("availability_slots")
      .update({ status: "available", meeting_id: null })
      .eq("user_id", meeting.invitee_id)
      .eq("slot_start", accepted.start)
      .eq("status", "booked");
    if (availErr) return NextResponse.json({ error: availErr.message }, { status: 500 });
  }

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
