import { createHash } from "node:crypto";
import {
  getPublicExhibitors,
  getPublicKeyParticipants,
  getPublicSessions,
  getPublicVenues,
} from "@/lib/public-data";

/**
 * A fingerprint of what the saved screens show: the programme, the stalls,
 * the speakers, the halls, and the build. Phones compare it with the one
 * they last saved against and only re-save (offline-support.tsx) or
 * re-read the agenda (refresh-on-return.tsx) when it has changed, instead
 * of on a timer. The CDN answers for a minute, so most checks never reach
 * a function at all.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const [sessions, exhibitors, people, venues] = await Promise.all([
    getPublicSessions(),
    getPublicExhibitors(),
    getPublicKeyParticipants(),
    getPublicVenues(),
  ]);
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
  const v = createHash("sha1")
    .update(JSON.stringify([build, sessions, exhibitors, people, venues]))
    .digest("hex")
    .slice(0, 16);
  return Response.json(
    { v },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" } }
  );
}
