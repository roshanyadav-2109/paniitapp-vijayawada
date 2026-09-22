import { createClient } from "@/lib/supabase/server";
import { LoginCta } from "@/components/features/login-cta";
import { RealtimeRefresh } from "@/components/features/realtime-refresh";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
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

    // Attachments live in two columns added by migration 0017. Until that
    // migration is applied the whole select would 400 on an unknown column
    // and the feed would go blank, so ask for them, and on exactly that
    // error ask again without them. Posts render without attachments; they
    // appear on their own once the migration lands.
    const COLUMNS =
      "id, body, kind, like_count, comment_count, vote_count, is_pinned, created_at, author_id, author:author_id(id, full_name, designation, company, photo_url, role), poll_options(id, label, position, vote_count)";
    const MEDIA = "media_url, media_type, ";

    const query = (cols: string) =>
      supabase
        .from("posts")
        .select(cols)
        .eq("event_id", EVENT_ID)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

    let { data, error } = await query(MEDIA + COLUMNS);
    if (error?.code === "42703") {
      ({ data, error } = await query(COLUMNS));
    }
    if (error) errored = true;
    posts = ((data as unknown as PostRow[] | null) ?? []).map((p) => ({
      ...p,
      media_url: p.media_url ?? null,
      media_type: p.media_type ?? null,
    }));

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


  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  posts = emptied(posts);

  const signedIn = await isSignedIn();

  return (
    <div className="mx-auto w-full max-w-2xl pt-5 pb-10 lg:pt-8">
      {/* The feed is everyone's, so it has to move on its own. Likes and
          votes arrive in bursts, hence the longer quiet period. */}
      <RealtimeRefresh
        channel="discuss-feed"
        quietMs={1500}
        tables={[
          { table: "posts" },
          { table: "post_comments" },
          { table: "post_likes" },
          { table: "poll_votes" },
          { table: "poll_options" },
        ]}
      />
      {!signedIn ? (
        <LoginCta
          next="/discuss"
          className="mb-4"
        />
      ) : null}
      {/* No title or standfirst, as on the agenda and the directory: the tab
          at the bottom of the screen already says Discussion, and the
          composer under it says what to do with it. */}
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
