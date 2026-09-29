import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

const DEFAULT_GOOGLE_CLIENT_ID =
  "1076635361002-gtk11i99pcdc97j5uectb3ov1hgv7ifi.apps.googleusercontent.com";

/**
 * Sign-ins in flight: each one's state, nonce and destination, in one
 * cookie holding the few most recent rather than one cookie holding the
 * latest.
 *
 * It was one of each, and each new login screen replaced them. So a second
 * screen open anywhere (the installed app and a browser tab, two tabs)
 * made the first one's sign-in fail with invalid_google_state; so did any
 * retry after a failure, which cleared them; and so did a login screen left
 * open past their ten minutes. Several now wait side by side for an hour,
 * a failure leaves them be, and a success takes them all away.
 */
export const GOOGLE_OAUTH_PENDING_COOKIE = "google_oauth_pending";
/** The single cookies this replaced, still read for a sign-in begun before. */
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_NONCE_COOKIE = "google_oauth_nonce";
export const GOOGLE_OAUTH_NEXT_COOKIE = "google_oauth_next";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60;
const PENDING_MAX = 5;

export const googleOAuthCookieOptions = {
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export interface PendingSignIn {
  state: string;
  nonce: string;
  next: string;
  at: number;
}

export function readPending(raw: string | undefined): PendingSignIn[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.filter(
      (p): p is PendingSignIn =>
        !!p &&
        typeof p.state === "string" &&
        typeof p.nonce === "string" &&
        typeof p.next === "string" &&
        typeof p.at === "number" &&
        now - p.at < GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS * 1000
    );
  } catch {
    return [];
  }
}

/** The pending cookie with one more sign-in at the front, oldest dropped. */
export function addPending(raw: string | undefined, entry: PendingSignIn): string {
  const list = [entry, ...readPending(raw)].slice(0, PENDING_MAX);
  return Buffer.from(JSON.stringify(list), "utf8").toString("base64url");
}

/** Reads the pending cookie off a request, for the routes that add to it. */
export function pendingFromRequest(req: Request): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  const hit = header
    .split(/;\s*/)
    .find((c) => c.startsWith(`${GOOGLE_OAUTH_PENDING_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(GOOGLE_OAUTH_PENDING_COOKIE.length + 1)) : undefined;
}

export function createGoogleOAuthRequest() {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");

  return {
    state,
    nonce,
    hashedNonce: createHash("sha256").update(nonce).digest("hex"),
  };
}

export function googleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    DEFAULT_GOOGLE_CLIENT_ID
  );
}

export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

/**
 * Hosts whose /auth/google/callback is registered with Google. Checked
 * against Google itself on 29/09/26: both are accepted.
 */
const REGISTERED_ORIGINS = [
  "https://andhra.paniit.space",
  "https://paniitapp-vijayawada-ashen.vercel.app",
];

/** The origin the visitor actually reached, as the proxy in front saw it. */
function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

export function googleRedirectUri(req: Request): string {
  // Back to the host the sign-in started on, whenever Google knows it. The
  // state and nonce are cookies on that host, and so is the session the
  // sign-in ends by setting: sent to another host, as the configured
  // address did (the vercel.app one, while people use andhra.paniit.space),
  // the state was never there to match — "invalid_google_state" every time
  // — and a session set there would not have signed anyone in here.
  const own = requestOrigin(req);
  if (REGISTERED_ORIGINS.includes(own)) return `${own}/auth/google/callback`;

  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin;
  return `${origin.replace(/\/$/, "")}/auth/google/callback`;
}

export function redirectWithGoogleAuthError(
  req: Request,
  error: string,
  clearCookies = false
) {
  const origin = new URL(req.url).origin;
  const response = NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, origin)
  );

  if (clearCookies) clearGoogleOAuthCookies(response);
  return response;
}

export function clearGoogleOAuthCookies(response: NextResponse) {
  response.cookies.delete(GOOGLE_OAUTH_PENDING_COOKIE);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  response.cookies.delete(GOOGLE_OAUTH_NONCE_COOKIE);
  response.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
}

/** Starts a sign-in: a new pending entry on the response, beside any others. */
export function setPendingSignIn(
  req: Request,
  res: NextResponse,
  entry: Omit<PendingSignIn, "at">
) {
  res.cookies.set(
    GOOGLE_OAUTH_PENDING_COOKIE,
    addPending(pendingFromRequest(req), { ...entry, at: Date.now() }),
    googleOAuthCookieOptions
  );
}
