import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { EVENT_ID } from "@/lib/event-config";
import { DiscussClient, type PostRow } from "./discuss-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function DiscussPage() {
  let posts: PostRow[] = [];
  let likedIds: string[] = [];
  const myVotes: Record<string, string> = {};
  let userId: string | null = null;
  let errored = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, body, kind, like_count, comment_count, vote_count, is_pinned, created_at, author_id, author:author_id(id, full_name, designation, company, photo_url, role), poll_options(id, label, position, vote_count)"
      )
      .eq("event_id", EVENT_ID)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) errored = true;
    posts = (data as unknown as PostRow[] | null) ?? [];

    if (user && posts.length > 0) {
      const ids = posts.map((p) => p.id);
      const [{ data: likes }, { data: votes }] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", ids),
        supabase
          .from("poll_votes")
          .select("post_id, option_id")
          .eq("user_id", user.id)
          .in("post_id", ids),
      ]);
      likedIds = ((likes as { post_id: string }[] | null) ?? []).map((l) => l.post_id);
      for (const v of (votes as { post_id: string; option_id: string }[] | null) ?? []) {
        myVotes[v.post_id] = v.option_id;
      }
    }
  } catch (err) {
    rethrowIfRedirect(err);
    errored = true;
  }

  return (
    <div className="mx-auto w-full max-w-2xl pt-5 pb-10 lg:pt-8">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-brand-900 lg:text-3xl">
          Discussion
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Ask the room, share what you&apos;re working on, or run a quick poll.
        </p>
      </header>
      <DiscussClient
        posts={posts}
        likedIds={likedIds}
        myVotes={myVotes}
        userId={userId}
        errored={errored}
      />
    </div>
  );
}
