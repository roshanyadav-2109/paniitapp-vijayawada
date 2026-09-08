import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { ExhibitorsClient, type ExhibitorRow } from "./exhibitors-client";

export const dynamic = "force-dynamic";

export default async function ExhibitorsPage() {
  let rows: ExhibitorRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("exhibitors")
      .select(
        "id, name, tagline, logo_url, category, booth_number, location_floor, website"
      )
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    rows = (data as ExhibitorRow[] | null) ?? [];
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 lg:pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 lg:text-3xl">
          Exhibitors
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Browse the show floor — meet the teams behind each booth.
        </p>
      </header>
      <ExhibitorsClient initialRows={rows} />
    </div>
  );
}
