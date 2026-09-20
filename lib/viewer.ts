import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";

/**
 * Is anyone signed in on this request?
 *
 * Screens use this to decide how much to show: a guest gets the shape of
 * the thing and a prompt, someone signed in gets all of it.
 *
 * Deliberately not tied to the dev auth bypass. The bypass exists so the
 * app can be reviewed without a login, and that is exactly the guest view
 * this returns — to see the signed-in version locally, sign in for real.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch (err) {
    rethrowIfRedirect(err);
    // Treat an unreachable auth service as signed out: the guest view is
    // the safe one to render, and it says how to fix it.
    return false;
  }
}
