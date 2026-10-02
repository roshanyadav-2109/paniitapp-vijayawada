import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { EVENT_ID } from "@/lib/event-config";
import type { PostRow } from "./discuss-client";

const PAGE_SIZE = 50;

export interface LoadedPosts {
  posts: PostRow[];
  likedIds: string[];
  myVotes: Record<string, string>;
  userId: string | null;
  errored: boolean;
}

/**
 * The posts of one conversation, and what the viewer has liked and voted.
 *
 * The Discuss feed is the conversation with no session; each session's page
 * has its own (0027). Both read them the same way, so both come here.
 */
export async function loadPosts(sessionId: string | null): Promise<LoadedPosts> {
  const out: LoadedPosts = { posts: [], likedIds: [], myVotes: {}, userId: null, errored: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    out.userId = user?.id ?? null;

    const base = supabase
      .from("posts")
      .select(
        "media_url, media_type, id, body, kind, as_team, like_count, comment_count, vote_count, is_pinned, created_at, author_id, author:author_id(id, full_name, designation, company, photo_url, role), poll_options(id, label, position, vote_count)"
      )
      .eq("event_id", EVENT_ID);
    const { data, error } = await (sessionId ? base.eq("session_id", sessionId) : base.is("session_id", null))
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) out.errored = true;
    out.posts = ((data as unknown as PostRow[] | null) ?? []).map((p) => {
      // A post made as the summit team says nothing about which admin wrote
      // it: no name, photo or title reaches the page, only that it is the
      // team's. The id stays, so its author can still delete it.
      const raw = Array.isArray(p.author) ? p.author[0] : p.author;
      const asTeam = !!p.as_team && (raw?.role === "admin" || raw?.role === "organizer");
      return {
        ...p,
        author: asTeam
          ? ({ id: null, full_name: null, designation: null, company: null, photo_url: null, role: "admin" } as unknown as PostRow["author"])
          : p.author,
        media_url: p.media_url ?? null,
        media_type: p.media_type ?? null,
      };
    });

    if (user && out.posts.length > 0) {
      const ids = out.posts.map((p) => p.id);
      const [{ data: likes }, { data: votes }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
        supabase.from("poll_votes").select("post_id, option_id").eq("user_id", user.id).in("post_id", ids),
      ]);
      out.likedIds = ((likes as { post_id: string }[] | null) ?? []).map((l) => l.post_id);
      for (const v of (votes as { post_id: string; option_id: string }[] | null) ?? []) {
        out.myVotes[v.post_id] = v.option_id;
      }
    }
  } catch (err) {
    rethrowIfRedirect(err);
    out.errored = true;
  }
  return out;
}
