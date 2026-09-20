import "server-only";
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Sending a push to somebody.
 *
 * The organiser console had its own copy of this inside an API route, which
 * meant the four things people actually want to be told about — a message, a
 * meeting, a session about to start — had no way to tell them. This is that
 * code with the console-specific parts taken out, so any server path can
 * call it.
 *
 * It reads subscriptions with the service-role client on purpose: the sender
 * is not the recipient, and no policy lets one delegate read another's push
 * endpoint. A subscription that comes back 404 or 410 is dead — the browser
 * that made it has thrown it away — so it is cleared rather than retried
 * forever.
 *
 * Failure is never raised to the caller. A message that sent but could not
 * be announced is a message that sent.
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Where tapping it should land. Same-origin path. */
  url?: string;
  /** Replaces an earlier notification with the same tag instead of stacking. */
  tag?: string;
}

function configured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0 || !configured()) return { sent: 0, failed: 0 };

  try {
    const admin = createServiceRoleClient();
    const { data: targets } = await admin
      .from("profiles")
      .select("id, push_subscription")
      .in("id", ids);

    const rows = (targets ?? []).filter(
      (t): t is { id: string; push_subscription: Record<string, unknown> } =>
        !!t.push_subscription && typeof t.push_subscription === "object"
    );
    if (rows.length === 0) return { sent: 0, failed: 0 };

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/home",
      tag: payload.tag,
    });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      rows.map(async (t) => {
        try {
          await webpush.sendNotification(
            t.push_subscription as unknown as webpush.PushSubscription,
            body
          );
          sent++;
        } catch (err) {
          failed++;
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await admin
              .from("profiles")
              .update({ push_subscription: null })
              .eq("id", t.id);
          }
        }
      })
    );
    return { sent, failed };
  } catch {
    return { sent: 0, failed: 0 };
  }
}

/** One person, which is most of the calls. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  await sendPushToUsers([userId], payload);
}

/** A display name for the person a notification is about. */
export async function pushDisplayName(userId: string): Promise<string> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const name = (data as { full_name: string | null } | null)?.full_name;
    return name?.trim() || "A delegate";
  } catch {
    return "A delegate";
  }
}
