import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";

export interface MyProfile {
  full_name: string | null;
  designation: string | null;
  company: string | null;
  push_subscription: unknown;
  role: string | null;
}

/**
 * The signed-in person's own row, read once per request.
 *
 * The layout reads it to check the profile is finished and the viewer
 * reads it for the push subscription; they were two queries to Tokyo, one
 * after the other, on every screen. One query now, with both answers in it.
 */
export const getMyProfile = cache(async (userId: string): Promise<MyProfile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, designation, company, push_subscription, role")
    .eq("id", userId)
    .maybeSingle();
  return (data as MyProfile | null) ?? null;
});

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
export const isSignedIn = cache(async function isSignedIn(): Promise<boolean> {
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
});

export interface Viewer {
  signedIn: boolean;
  /** Stable per account, and the key the prompts scope themselves by. */
  userId: string | null;
  /** Whether THIS account has a push subscription stored against it. */
  pushRegistered: boolean;
  /** Organisers and admins: the people the admin panel opens for. */
  isAdmin: boolean;
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
export const getViewer = cache(async function getViewer(): Promise<Viewer> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, userId: null, pushRegistered: false, isAdmin: false };

    const me = await getMyProfile(user.id);

    return {
      signedIn: true,
      userId: user.id,
      pushRegistered: !!me?.push_subscription,
      isAdmin: me?.role === "admin" || me?.role === "organizer",
    };
  } catch (err) {
    rethrowIfRedirect(err);
    return { signedIn: false, userId: null, pushRegistered: false, isAdmin: false };
  }
});
