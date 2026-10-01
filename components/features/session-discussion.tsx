import { DiscussClient } from "@/app/(authed)/discuss/discuss-client";
import { loadPosts } from "@/app/(authed)/discuss/load-posts";

/**
 * The open conversation about one session, on its page: everyone reads it,
 * anyone signed in joins it, with the Discuss feed's photos, videos, polls,
 * likes and comments. Questions for the panel go privately to the
 * moderators instead (Ask the panel, just above it).
 */
export async function SessionDiscussion({ sessionId }: { sessionId: string }) {
  const { posts, likedIds, myVotes, userId, errored } = await loadPosts(sessionId);

  return (
    <>
      {/* No live listener here: a full hall reading the session page held
          one database connection each, and a like reloaded the page for all
          of them. Posts show as the page opens; your own appear at once. */}
      <DiscussClient
        posts={posts}
        likedIds={likedIds}
        myVotes={myVotes}
        userId={userId}
        errored={errored}
        sessionId={sessionId}
      />
    </>
  );
}
