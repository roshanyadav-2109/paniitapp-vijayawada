"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";

export type ActionResult = { ok: true } | { error: string };

const PostSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  // A poll needs at least two distinct options to be a poll.
  options: z.array(z.string().trim().min(1).max(120)).max(4).optional(),
});

export async function createPost(
  body: string,
  options?: string[]
): Promise<ActionResult> {
  const cleaned = (options ?? []).map((o) => o.trim()).filter(Boolean);
  const parsed = PostSchema.safeParse({ body, options: cleaned });
  if (!parsed.success) return { error: "Write something first." };
  if (cleaned.length === 1) return { error: "A poll needs at least two options." };
  if (new Set(cleaned).size !== cleaned.length)
    return { error: "Poll options must be different." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to post." };

  const isPoll = cleaned.length >= 2;
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      event_id: EVENT_ID,
      author_id: user.id,
      body: parsed.data.body,
      kind: isPoll ? "poll" : "text",
    })
    .select("id")
    .single();
  if (error || !post) return { error: error?.message ?? "Could not post." };

  if (isPoll) {
    const { error: optErr } = await supabase.from("poll_options").insert(
      cleaned.map((label, i) => ({ post_id: post.id, label, position: i }))
    );
    if (optErr) {
      // Don't leave a poll with no options — it would render as a dead card.
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: optErr.message };
    }
  }

  revalidatePath("/discuss");
  return { ok: true };
}

export async function toggleLike(postId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(postId).success) return { error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
    : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });

  if (error) return { error: error.message };
  revalidatePath("/discuss");
  return { ok: true };
}

export async function votePoll(
  postId: string,
  optionId: string
): Promise<ActionResult> {
  if (
    !z.string().uuid().safeParse(postId).success ||
    !z.string().uuid().safeParse(optionId).success
  )
    return { error: "invalid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };

  // The option must belong to this poll — otherwise a crafted request could
  // add a vote to another post's tally.
  const { data: option } = await supabase
    .from("poll_options")
    .select("id")
    .eq("id", optionId)
    .eq("post_id", postId)
    .maybeSingle();
  if (!option) return { error: "invalid" };

  // (post_id, user_id) is the primary key, so this changes an existing vote
  // rather than adding one; the trigger moves the tally between options.
  const { error } = await supabase
    .from("poll_votes")
    .upsert(
      { post_id: postId, user_id: user.id, option_id: optionId },
      { onConflict: "post_id,user_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/discuss");
  return { ok: true };
}

export async function addComment(
  postId: string,
  body: string
): Promise<ActionResult> {
  const parsed = z.string().trim().min(1).max(1000).safeParse(body);
  if (!parsed.success || !z.string().uuid().safeParse(postId).success)
    return { error: "Write something first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, body: parsed.data });
  if (error) return { error: error.message };

  revalidatePath("/discuss");
  return { ok: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(postId).success) return { error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };

  // RLS already restricts this to the author or an organizer.
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/discuss");
  return { ok: true };
}
