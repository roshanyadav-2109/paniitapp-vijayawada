import { createClient } from "@/lib/supabase/server";
import { LoginCta } from "@/components/features/login-cta";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
import { rethrowIfRedirect } from "@/lib/redirect";
import { ExhibitorsClient, type ExhibitorRow } from "./exhibitors-client";
import { EVENT_ID } from "@/lib/event-config";

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
      .eq("event_id", EVENT_ID)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    rows = (data as ExhibitorRow[] | null) ?? [];
  } catch (err) {
    rethrowIfRedirect(err);
  }


  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  rows = emptied(rows);

  const signedIn = await isSignedIn();

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 lg:pt-8">
      {!signedIn ? (
        <LoginCta
          next="/exhibitors"
          className="mb-4"
        />
      ) : null}
      {/* No title or standfirst, as on the agenda, the directory and the
          discussion: the tab at the foot of the screen already says Expo,
          and the search box under it says what to do with the page. */}
      <ExhibitorsClient initialRows={rows} />
    </div>
  );
}
