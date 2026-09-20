import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  createGoogleOAuthRequest,
  googleClientId,
  googleOAuthCookieOptions,
  safeNext,
} from "@/lib/auth/google-oauth";

/**
 * The same state and nonce /auth/google/start issues, handed back as JSON
 * instead of being followed by a redirect to accounts.google.com.
 *
 * That redirect is why signing in used to leave the app: a navigation out of
 * the service worker's scope drops an installed copy into the system
 * browser, and what comes back is a web page, not the app. Google Identity
 * Services can do the whole exchange inside the page instead — but it needs
 * the nonce up front, which is what this is for.
 *
 * The raw nonce stays in an httpOnly cookie for the server to verify with;
 * only its hash is given to the browser, which is what Google is shown.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const { hashedNonce, nonce, state } = createGoogleOAuthRequest();

  const res = NextResponse.json({
    clientId: googleClientId(),
    state,
    hashedNonce,
  });
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, googleOAuthCookieOptions);
  res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, googleOAuthCookieOptions);
  res.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, next, googleOAuthCookieOptions);
  return res;
}
