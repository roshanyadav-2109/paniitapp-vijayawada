import { getPublicExhibitors, getPublicSponsorBooths } from "@/lib/public-data";
import { VenueMap, type Occupant } from "./venue-map";

// Who holds which stall changes when the organisers allocate one, not
// while somebody is looking, so the page is cached with the catalogue.
export const revalidate = 300;

export default async function MapPage() {
  let occupants: Occupant[] = [];
  try {
    const [exhibitors, sponsors] = await Promise.all([
      getPublicExhibitors(),
      getPublicSponsorBooths(),
    ]);
    occupants = [
      ...exhibitors
        .filter((e) => e.booth_number)
        .map((e) => ({
          code: e.booth_number as string,
          name: e.name,
          logo_url: e.logo_url,
          category: e.category,
          href: `/exhibitors/${e.id}`,
        })),
      ...sponsors
        .filter((s) => s.booth_number)
        .map((s) => ({
          code: s.booth_number as string,
          name: s.name,
          logo_url: s.logo_url,
          category: s.tier ? `${s.tier} sponsor` : "Sponsor",
          href: `/sponsors/${s.id}`,
        })),
    ];
  } catch {
    occupants = [];
  }

  // No heading and no standfirst: the building is the page. The stalls
  // stand whether or not anyone has been allocated one yet.
  return (
    <div className="venue-page pt-2 lg:pt-6">
      <VenueMap occupants={occupants} />
    </div>
  );
}
