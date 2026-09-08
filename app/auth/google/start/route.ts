import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  createGoogleOAuthRequest,
  googleClientId,
  googleOAuthCookieOptions,
  googleRedirectUri,
  safeNext,
} from "@/lib/auth/google-oauth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next") || "/home");
  const redirectUri = googleRedirectUri(req);
  const { hashedNonce, nonce, state } = createGoogleOAuthRequest();

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", googleClientId());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "id_token token");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", hashedNonce);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, googleOAuthCookieOptions);
  res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, googleOAuthCookieOptions);
  res.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, next, googleOAuthCookieOptions);
  return res;
}
