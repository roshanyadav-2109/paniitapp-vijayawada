import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The front door opens onto the app, not onto a sign-in wall.
 *
 * Someone handed a link the week before the summit should land on the
 * programme, the sectors and the expo and be able to read them; the app
 * asks who they are at the point where a screen needs to know. The sign-in
 * page still exists, at /login, and every prompt links to it with a
 * `redirect` back to whatever the visitor was reading.
 */
export default function Index() {
  redirect("/home");
}
