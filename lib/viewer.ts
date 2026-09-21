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

export interface Viewer {
  signedIn: boolean;
  /** Stable per account, and the key the prompts scope themselves by. */
  userId: string | null;
  /** Whether THIS account has a push subscription stored against it. */
  pushRegistered: boolean;
}

/**
 * Who is asking, and whether they are already set up for notifications.
 *
 * The subscription question cannot be answered in the browser alone. A push
 * subscription belongs to the browser, but it is stored against a profile —
 * so when a second person signs in on a shared phone, the browser still
 * reports a subscription while their own account has none, and nothing sent
 * to them would ever arrive. This reads the account's own row.
 */
export async function getViewer(): Promise<Viewer> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, userId: null, pushRegistered: false };

    const { data } = await supabase
      .from("profiles")
      .select("push_subscription")
      .eq("id", user.id)
      .maybeSingle();

    return {
      signedIn: true,
      userId: user.id,
      pushRegistered: !!(data as { push_subscription: unknown } | null)
        ?.push_subscription,
    };
  } catch (err) {
    rethrowIfRedirect(err);
    return { signedIn: false, userId: null, pushRegistered: false };
  }
}
