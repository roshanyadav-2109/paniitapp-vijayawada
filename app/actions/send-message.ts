"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  recipient_id: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export type SendMessageResult =
  | { ok: true }
  | { error: "unauth" }
  | { error: "invalid"; message: string }
  | { error: "db"; message: string };

// Conversations are stored once per ordered pair (smaller UUID = participant_a).
// Returns the conversation id, creating one if it doesn't exist yet.
async function ensureConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  me: string,
  peer: string
): Promise<{ id: string } | { error: string }> {
  const a = me < peer ? me : peer;
  const b = me < peer ? peer : me;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();
  if (existing?.id) return { id: existing.id };

  const { data: created, error: insertErr } = await supabase
    .from("conversations")
    .insert({ participant_a: a, participant_b: b })
    .select("id")
    .maybeSingle();
  if (created?.id) return { id: created.id };

  // Race: another insert beat us via the unique index. Re-select.
  if (insertErr) {
    const { data: again } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", a)
      .eq("participant_b", b)
      .maybeSingle();
    if (again?.id) return { id: again.id };
    return { error: insertErr.message };
  }
  return { error: "conversation_failed" };
}

export async function sendMessage(input: {
  recipient_id: string;
  body: string;
}): Promise<SendMessageResult> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };
  if (user.id === parsed.data.recipient_id) {
    return { error: "invalid", message: "You can't message yourself" };
  }

  const conv = await ensureConversation(supabase, user.id, parsed.data.recipient_id);
  if ("error" in conv) return { error: "db", message: conv.error };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: "db", message: error.message };

  revalidatePath("/chat");
  revalidatePath(`/chat/${parsed.data.recipient_id}`);
  return { ok: true };
}

export async function markConversationRead(otherId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const a = user.id < otherId ? user.id : otherId;
  const b = user.id < otherId ? otherId : user.id;
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();
  if (!conv?.id) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conv.id)
    .neq("sender_id", user.id)
    .is("read_at", null);
}
