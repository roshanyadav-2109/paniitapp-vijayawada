import { MapPin } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { FloorMap, type VenueRow, type SessionAtVenue } from "./floor-map";
import { EVENT_ID, EVENT_VENUE } from "@/lib/event-config";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  let venues: VenueRow[] = [];
  let sessions: SessionAtVenue[] = [];
  let errored = false;

  try {
    const supabase = await createClient();
    const [v, s] = await Promise.all([
      supabase
        .from("venues")
        .select("id, name, floor, map_floor, map_x, map_y, capacity")
        .eq("event_id", EVENT_ID)
        .order("map_floor", { ascending: true, nullsFirst: true })
        .order("name", { ascending: true }),
      supabase
        .from("sessions")
        .select("id, title, start_at, end_at, venue_id, track")
        .eq("event_id", EVENT_ID)
        .order("start_at", { ascending: true }),
    ]);
    venues = (v.data as VenueRow[] | null) ?? [];
    sessions = (s.data as SessionAtVenue[] | null) ?? [];
  } catch {
    errored = true;
  }

  return (
    <div className="pt-5 lg:pt-8">
      <header className="mb-5 lg:mb-8">
        <h1 className="font-display text-2xl font-semibold text-brand-900 lg:text-3xl">
          Venue map
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          {EVENT_VENUE} · interactive floor plan
        </p>
      </header>

      {errored || venues.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>No venues yet</EmptyTitle>
            <EmptyDescription>
              The interactive floor plan appears here once venues are seeded.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FloorMap venues={venues} sessions={sessions} />
      )}
    </div>
  );
}
