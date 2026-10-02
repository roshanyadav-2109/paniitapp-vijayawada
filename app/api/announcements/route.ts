import { getPublicAnnouncements } from "@/lib/public-data";

export const revalidate = 30;

/** The bell's feed: the same for everyone, so the CDN serves it. */
export async function GET() {
  const items = await getPublicAnnouncements().catch(() => []);
  return Response.json(items, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" },
  });
}
