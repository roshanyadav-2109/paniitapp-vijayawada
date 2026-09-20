import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public-client";
import { EVENT_ID } from "@/lib/event-config";

/**
 * The event as everybody sees it: the programme, the venues, the expo, the
 * guest list, the sponsors.
 *
 * None of this depends on who is asking, so it is read once and shared. Each
 * reader below is wrapped in Next's data cache with a five-minute window and
 * a tag, so a change in the organiser console can drop it immediately
 * (revalidateTag) rather than waiting the window out.
 *
 * What is deliberately NOT here: bookmarks, meetings, connections, the
 * discussion feed, anything under /me. Those differ per visitor and are read
 * through the cookie-carrying client on every request, uncached.
 */

const FIVE_MINUTES = 300;

export interface PublicSession {
  id: string;
  title: string;
  description: string | null;
  track: string | null;
  venue_id: string | null;
  start_at: string;
  end_at: string;
  is_featured: boolean | null;
  capacity: number | null;
  current_checkins: number | null;
  venues: { id: string; name: string; floor: string | null } | null;
  interests?: string[] | null;
}

export const getPublicSessions = unstable_cache(
  async (): Promise<PublicSession[]> => {
    const supabase = createPublicClient();
    const columns =
      "id, title, description, track, venue_id, start_at, end_at, is_featured, capacity, current_checkins, venues(id, name, floor)";

    // sessions.interests only exists once migration 0007 has run; the
    // fallback keeps an older database rendering rather than erroring.
    const withInterests = await supabase
      .from("sessions")
      .select(`${columns}, interests`)
      .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true });

    if (!withInterests.error) {
      return (withInterests.data as unknown as PublicSession[]) ?? [];
    }

    const fallback = await supabase
      .from("sessions")
      .select(columns)
      .eq("event_id", EVENT_ID)
      .order("start_at", { ascending: true });
    return (fallback.data as unknown as PublicSession[]) ?? [];
  },
  ["public-sessions", EVENT_ID],
  { revalidate: FIVE_MINUTES, tags: ["sessions"] }
);

export interface PublicExhibitor {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  category: string | null;
  booth_number: string | null;
  location_floor: string | null;
  website: string | null;
}

export const getPublicExhibitors = unstable_cache(
  async (): Promise<PublicExhibitor[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("exhibitors")
      .select(
        "id, name, tagline, logo_url, category, booth_number, location_floor, website"
      )
      .eq("event_id", EVENT_ID)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    return (data as PublicExhibitor[] | null) ?? [];
  },
  ["public-exhibitors", EVENT_ID],
  { revalidate: FIVE_MINUTES, tags: ["exhibitors"] }
);

export const getPublicExhibitorCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createPublicClient();
    const { count } = await supabase
      .from("exhibitors")
      .select("id", { count: "exact", head: true })
      .eq("event_id", EVENT_ID);
    return count ?? 0;
  },
  ["public-exhibitor-count", EVENT_ID],
  { revalidate: FIVE_MINUTES, tags: ["exhibitors"] }
);

export interface PublicVenue {
  id: string;
  name: string;
  floor: string | null;
  map_x: number | null;
  map_y: number | null;
  map_floor: string | null;
  description: string | null;
  capacity: number | null;
}

export const getPublicVenues = unstable_cache(
  async (): Promise<PublicVenue[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("venues")
      .select("id, name, floor, map_x, map_y, map_floor, description, capacity")
      .eq("event_id", EVENT_ID)
      .order("name", { ascending: true });
    return (data as PublicVenue[] | null) ?? [];
  },
  ["public-venues", EVENT_ID],
  { revalidate: FIVE_MINUTES, tags: ["venues"] }
);
