import { getViewer } from "@/lib/viewer";
import { getMyExhibitors } from "@/lib/exhibitor-access";
import { DiscussClient } from "@/app/(authed)/discuss/discuss-client";
import { RealtimeRefresh } from "@/components/features/realtime-refresh";
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
      {/* This session's posts, live. A like or a comment updates the
          post's own row, so listening to its rows is enough. Phones spread
          their refreshes over a few seconds. */}
      <RealtimeRefresh
        channel={`session-posts-${sessionId}`}
        quietMs={1500}
        jitterMs={3000}
        tables={[{ table: "posts", filter: `session_id=eq.${sessionId}` }]}
      />
      <DiscussClient
        posts={posts}
        likedIds={likedIds}
        myVotes={myVotes}
        userId={userId}
        errored={errored}
        sessionId={sessionId}
        isAdmin={(await getViewer()).isAdmin}
        myExhibitors={await getMyExhibitors()}
      />
    </>
  );
}
