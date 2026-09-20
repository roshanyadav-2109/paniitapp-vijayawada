import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";
import { SUMMIT_TZ } from "@/lib/constants";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

/** How far ahead of a session to tell the people who bookmarked it. */
const LEAD_MINUTES = 15;
/** How far past that to still count, so a late run does not skip a session. */
const WINDOW_MINUTES = 20;

/**
 * "Your next session starts in a few minutes."
 *
 * Runs on a schedule (vercel.json) rather than being triggered by anything a
 * person does, which is the only way to announce something that has not
 * happened yet. Every send is written to push_log first, so a run that
 * overlaps the previous one — or a retry — cannot tell the same person about
 * the same session twice.
 *
 * Only bookmarked sessions. Fifty-eight sessions announced to everybody is
 * not a reminder, it is a reason to turn notifications off.
 */
export async function GET(req: Request) {
  // Vercel signs its own cron requests; anything else needs the secret.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const fromVercel = req.headers.get("x-vercel-cron") !== null;
  if (!fromVercel && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const now = Date.now();
  const from = new Date(now + LEAD_MINUTES * 60_000).toISOString();
  const to = new Date(now + (LEAD_MINUTES + WINDOW_MINUTES) * 60_000).toISOString();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, start_at, venues(name)")
    .eq("event_id", EVENT_ID)
    .gte("start_at", from)
    .lt("start_at", to);

  const rows = (sessions ?? []) as unknown as {
    id: string;
    title: string;
    start_at: string;
    venues: { name: string } | null;
  }[];
  if (rows.length === 0) return NextResponse.json({ ok: true, sessions: 0 });

  let announced = 0;
  for (const s of rows) {
    const { data: marks } = await admin
      .from("session_bookmarks")
      .select("user_id")
      .eq("session_id", s.id);
    const userIds = ((marks ?? []) as { user_id: string }[]).map((m) => m.user_id);
    if (userIds.length === 0) continue;

    // Claim each recipient before sending. The insert fails for anyone
    // already told, and only the rows that were actually inserted come back.
    const { data: claimed } = await admin
      .from("push_log")
      .upsert(
        userIds.map((user_id) => ({ user_id, kind: "session_soon", ref_id: s.id })),
        { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true }
      )
      .select("user_id");

    const fresh = ((claimed ?? []) as { user_id: string }[]).map((c) => c.user_id);
    if (fresh.length === 0) continue;

    const at = formatInTimeZone(new Date(s.start_at), SUMMIT_TZ, "h:mm a");
    const where = s.venues?.name ? ` · ${s.venues.name}` : "";
    const { sent } = await sendPushToUsers(fresh, {
      title: s.title,
      body: `Starts at ${at}${where}`,
      url: `/agenda/${s.id}`,
      tag: `session-${s.id}`,
    });
    announced += sent;
  }

  return NextResponse.json({ ok: true, sessions: rows.length, announced });
}
