import { LoginCta } from "@/components/features/login-cta";
import { isSignedIn } from "@/lib/viewer";
import { emptied } from "@/lib/dev-empty";
import { rethrowIfRedirect } from "@/lib/redirect";
import { ExhibitorsClient, type ExhibitorRow } from "./exhibitors-client";
import { getPublicExhibitors } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function ExhibitorsPage() {
  let rows: ExhibitorRow[] = [];
  try {
    // The floor is the same for everybody; read once and shared.
    rows = (await getPublicExhibitors()) as unknown as ExhibitorRow[];
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
