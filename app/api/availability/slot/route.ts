import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const Body = z.object({
  slot: z.object({ start: z.string(), end: z.string() }),
  status: z.enum(["available", "blocked"]),
});

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

  const admin = createServiceRoleClient();
  const { data: acceptedMeetings, error: acceptedErr } = await admin
    .from("meetings")
    .select("accepted_slot")
    .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
    .eq("status", "accepted");
  if (acceptedErr) return NextResponse.json({ error: acceptedErr.message }, { status: 500 });

  const occupied = ((acceptedMeetings as AcceptedRow[] | null) ?? []).some(
    (m) =>
      m.accepted_slot &&
      new Date(slot.start) < new Date(m.accepted_slot.end) &&
      new Date(m.accepted_slot.start) < new Date(slot.end)
  );
  if (occupied) return NextResponse.json({ error: "slot_occupied" }, { status: 409 });

  const { error } = await admin.from("availability_slots").upsert(
    {
      user_id: user.id,
      slot_start: slot.start,
      slot_end: slot.end,
      status: parsed.data.status,
    },
    { onConflict: "user_id,slot_start" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
