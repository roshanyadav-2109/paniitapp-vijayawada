import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildDaySlots, classifySlot } from "@/lib/slots";
import { EVENT_ID } from "@/lib/event-config";

const Body = z.object({ meeting_id: z.string().uuid() });

interface AcceptedRow {
  accepted_slot: { start: string; end: string } | null;
}
interface BookmarkRow {
  sessions: { start_at: string; end_at: string } | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  // NOTE (pre-existing): these argument names do not match the SQL function,
  // whose signature is (p_user_a, p_user_b, p_duration_min, p_event_id). This
  // call has always errored, so the JS fallback below is what actually runs.
  // Left as-is deliberately — fixing it changes which code path serves this
  // route and needs a decision on which counterparty to pass as p_user_b.
  const { data, error } = await supabase.rpc("suggest_alternative_slots", {
    p_user_id: user.id,
    p_count: 3,
  });
  if (!error && Array.isArray(data) && data.length > 0) {
    return NextResponse.json({ slots: data });
  }

  const [bms, mts] = await Promise.all([
    supabase
      .from("session_bookmarks")
      .select("sessions(start_at, end_at)")
      .eq("user_id", user.id),
    supabase
      .from("meetings")
      .select("accepted_slot")
      .eq("event_id", EVENT_ID)
      .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .eq("status", "accepted"),
  ]);
  const bookmarks =
    ((bms.data as BookmarkRow[] | null) ?? [])
      .map((r) => r.sessions)
      .filter((s): s is { start_at: string; end_at: string } => !!s)
      .map((s) => ({ start: s.start_at, end: s.end_at }));
  const accepted =
    ((mts.data as AcceptedRow[] | null) ?? [])
      .map((m) => m.accepted_slot)
      .filter((s): s is { start: string; end: string } => !!s);

  const free = buildDaySlots().filter((s) => classifySlot(s, bookmarks, accepted) === "free");
  return NextResponse.json({ slots: free.slice(0, 3) });
}
