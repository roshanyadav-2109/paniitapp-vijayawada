// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push
// Invoke (server-only): POST with { user_ids: string[], title, body, url?, tag? }
//
// Requires env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
//               SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

// @ts-expect-error Deno runtime imports
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error Deno runtime imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error Deno runtime imports
import webpush from "https://esm.sh/web-push@3.6.7";

// @ts-expect-error Deno global
const env = Deno.env;

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const VAPID_PUBLIC = env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE = env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = env.get("VAPID_SUBJECT");
  const SB_URL = env.get("SUPABASE_URL");
  const SB_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT || !SB_URL || !SB_KEY) {
    return new Response("misconfigured", { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.user_ids?.length || !body?.title || !body?.body) {
    return new Response("invalid", { status: 400 });
  }

  const admin = createClient(SB_URL, SB_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: targets } = await admin
    .from("profiles")
    .select("id, push_subscription")
    .in("id", body.user_ids);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    url: body.url ?? "/",
    tag: body.tag,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    (targets ?? []).map(async (t: { id: string; push_subscription: unknown }) => {
      if (!t.push_subscription) return;
      try {
        await webpush.sendNotification(t.push_subscription, payload);
        sent++;
      } catch {
        failed++;
        await admin.from("profiles").update({ push_subscription: null }).eq("id", t.id);
      }
    })
  );

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
