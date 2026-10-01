import { LoginCta } from "@/components/features/login-cta";
import { RealtimeRefresh } from "@/components/features/realtime-refresh";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
import { DiscussClient } from "./discuss-client";
import { loadPosts } from "./load-posts";

export const dynamic = "force-dynamic";

export default async function DiscussPage() {
  // The feed is the conversation with no session; each session's page
  // holds its own (see load-posts.ts).
  const loaded = await loadPosts(null);
  const { likedIds, myVotes, userId, errored } = loaded;
  let posts = loaded.posts;

  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  posts = emptied(posts);

  const signedIn = await isSignedIn();

  return (
    // A slimmer margin than other pages on a phone (6px rather than 12px),
    // so posts get the width. From sm up it sits in its usual centred column.
    <div className="-mx-1.5 w-auto pt-5 pb-10 sm:mx-auto sm:w-full sm:max-w-2xl lg:pt-8">
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
