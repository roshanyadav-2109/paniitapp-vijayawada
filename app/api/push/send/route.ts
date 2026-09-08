import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const Body = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(2500),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  url: z.string().url().optional(),
  tag: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return NextResponse.json({ error: "vapid_not_configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = meProfile?.role;
  if (role !== "organizer" && role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: targets } = await admin
    .from("profiles")
    .select("id, push_subscription")
    .in("id", parsed.data.user_ids);

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url ?? "/",
    tag: parsed.data.tag,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    (targets ?? []).map(async (t: { id: string; push_subscription: unknown }) => {
      if (!t.push_subscription || typeof t.push_subscription !== "object") return;
      try {
        await webpush.sendNotification(
          t.push_subscription as webpush.PushSubscription,
          payload
        );
        sent++;
      } catch {
        failed++;
        // 410 Gone → drop the dead subscription
        await admin.from("profiles").update({ push_subscription: null }).eq("id", t.id);
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed });
}
