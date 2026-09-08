import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  clearGoogleOAuthCookies,
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

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const nonce = cookieStore.get(GOOGLE_OAUTH_NONCE_COOKIE)?.value;
  const next = safeNext(cookieStore.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value);

  if (!expectedState || state !== expectedState) {
    return jsonError("invalid_google_state");
  }
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

function jsonError(error: string, status = 400) {
  const response = NextResponse.json({ error }, { status });
  clearGoogleOAuthCookies(response);
  return response;
}
