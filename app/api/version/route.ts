/**
 * Which build is live. The app asks this now and then and, once it differs
 * from the build the phone is running, reloads itself at the next quiet
 * moment, so an update reaches phones without anyone closing the app. The
 * CDN holds the answer for a minute; a new deployment replaces it.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } }
  );
}
