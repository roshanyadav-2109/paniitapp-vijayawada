import { LoginCta } from "@/components/features/login-cta";
import { RealtimeRefresh } from "@/components/features/realtime-refresh";
import { getViewer, isSignedIn } from "@/lib/viewer";
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
    <div className="mx-auto w-full max-w-2xl pt-5 pb-10 lg:pt-8">
      {/* The feed moves on its own. Only the posts table is listened to:
          likes, comments and votes each update their post's counts there.
          Each phone waits its own few seconds before asking again, so a
          busy minute does not send every open feed to the server at once. */}
      <RealtimeRefresh
        channel="discuss-feed"
        quietMs={1500}
        jitterMs={3000}
        tables={[{ table: "posts" }]}
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
        isAdmin={(await getViewer()).isAdmin}
      />
    </div>
  );
}
