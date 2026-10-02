import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_PENDING_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  clearGoogleOAuthCookies,
  readPending,
  safeNext,
} from "@/lib/auth/google-oauth";
import { syncProfileForUser } from "@/lib/auth/sync-profile";
import { createClient } from "@/lib/supabase/server";

interface GoogleIdTokenPayload {
  id_token?: unknown;
  access_token?: unknown;
  state?: unknown;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as GoogleIdTokenPayload | null;
  const idToken = typeof body?.id_token === "string" ? body.id_token : "";
  const accessToken =
    typeof body?.access_token === "string" ? body.access_token : undefined;
  const state = typeof body?.state === "string" ? body.state : "";

  if (!idToken || !state) {
    return jsonError("missing_google_id_token");
  }

  // Whichever of the sign-ins waiting in this browser this one is; or, for
  // one begun before they waited side by side, the single cookies of old.
  const cookieStore = await cookies();
  const pending = readPending(cookieStore.get(GOOGLE_OAUTH_PENDING_COOKIE)?.value).find(
    (p) => p.state === state
  );
  const legacyState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const legacy =
    legacyState && legacyState === state
      ? {
          nonce: cookieStore.get(GOOGLE_OAUTH_NONCE_COOKIE)?.value,
          next: cookieStore.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value,
        }
      : null;

  if (!pending && !legacy) {
    return jsonError("invalid_google_state");
  }
  const nonce = pending?.nonce ?? legacy?.nonce;
  const next = safeNext(pending?.next ?? legacy?.next);
  if (!nonce) {
    return jsonError("missing_google_nonce");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    access_token: accessToken,
    nonce,
  });
  if (error) {
    return jsonError(error.message);
  }

  const user = data.user;
  if (!user?.email) {
    await supabase.auth.signOut();
    return jsonError("no_email_from_provider");
  }

  const { profileIncomplete } = await syncProfileForUser(user);
  const redirectTo = profileIncomplete
    ? `/onboarding?next=${encodeURIComponent(next)}`
    : next;
  const response = NextResponse.json({ redirectTo });
  clearGoogleOAuthCookies(response);
  return response;
}

// A failure leaves the waiting sign-ins where they are: clearing them made
// every retry from the same screen fail too, with invalid_google_state,
// until the page was reloaded.
function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
