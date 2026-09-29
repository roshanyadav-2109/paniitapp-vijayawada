import { RealtimeRefresh } from "@/components/features/realtime-refresh";
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
      {/* This session's posts only. A like or a comment updates the post's
          own counts, so listening to its rows is enough; poll counts and
          comment threads keep themselves live. */}
      <RealtimeRefresh
        channel={`session-posts-${sessionId}`}
        quietMs={1200}
        tables={[{ table: "posts", filter: `session_id=eq.${sessionId}` }]}
      />
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
