import { NextResponse, type NextRequest } from "next/server";
import { devAuthBypass } from "@/lib/dev-auth";

/**
 * Routes that mean nothing without an account, so a guest is sent to sign
 * in rather than shown an empty version of them. Everything else — the
 * programme, the directory, the expo, the map — is browsable signed out,
 * with a sign-in prompt where the content stops.
 */
const SIGNED_IN_ONLY = [
  "/me",
  "/recap",
  "/scan",
  "/admin",
  "/onboarding",
  "/chat/",
  "/meetings/",
];

// The allow-list this file used to keep is gone with the wall: everything
// that is not in SIGNED_IN_ONLY is now public, so there is nothing left to
// enumerate.

/**
 * What the session cookie says, read where it sits rather than asked of the
 * auth server.
 *
 * This runs on every request the app makes — every page, every navigation,
 * every RSC fetch — and it used to call getUser(), which is an HTTP request
 * to Supabase. The database is in Tokyo and the visitors are in Andhra
 * Pradesh, so that was somewhere around 200ms added to every click for
 * anyone signed in, before the page it asked for had begun. Signed-out
 * visitors never paid it, which is why it did not show in any measurement
 * taken from outside.
 *
 * Nothing here is a security check: middleware only decides where to send
 * you. Every page and route handler still calls getUser(), which verifies
 * the token with the auth server, and the database still answers to its own
 * policies. A forged cookie gets you as far as a screen that then refuses
 * to show you anything.
 *
 * Returns the session's expiry, null when there is no session cookie at
 * all, and "unreadable" when there is one this cannot make sense of — in
 * which case the caller asks the auth server, as before.
 */
type LocalSession = { expiresAt: number | null } | null | "unreadable";

function readSessionCookie(request: NextRequest): LocalSession {
  const parts = request.cookies
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith("sb-") &&
        c.name.includes("-auth-token") &&
        !c.name.includes("code-verifier")
    );
  if (parts.length === 0) return null;

  try {
    // Long sessions are split across .0, .1, … and have to be rejoined in
    // order before any of it parses.
    const raw = parts
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((c) => c.value)
      .join("");

    const json = raw.startsWith("base64-")
      ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/"))
      : decodeURIComponent(raw);
    const session = JSON.parse(json) as { expires_at?: number };
    return {
      expiresAt: typeof session.expires_at === "number" ? session.expires_at : null,
    };
  } catch {
    return "unreadable";
  }
}

export async function updateSession(request: NextRequest) {
  // Local review only — see lib/dev-auth.ts. Returns early so neither the
  // signed-in redirect off "/" nor the signed-out redirect onto it fires.
  if (devAuthBypass()) return NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Who is asking, as far as the cookie goes.
  const local = readSessionCookie(request);
  const now = Math.floor(Date.now() / 1000);
  // The one thing only the auth server can do is hand out a fresh token, so
  // that is the only thing it is still asked for: a couple of minutes before
  // the current one runs out. Any other request reads the cookie and goes
  // straight to the page.
  const mustRefresh =
    local === "unreadable" ||
    (local !== null && (local.expiresAt === null || local.expiresAt - now < 120));

  if (!mustRefresh) {
    const signedIn = local !== null;
    if (signedIn && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    if (!signedIn && SIGNED_IN_ONLY.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  try {
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // "/" is the app, not the door: it redirects to /home for everybody,
    // signed in or not. Someone already signed in who opens /login is the
    // one case still worth sending on.
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }

    // Signed out is no longer a dead end: a guest may browse the app and is
    // asked to sign in where the screen needs to know who they are. The
    // screens that only make sense as somebody — your profile, your badge,
    // the organiser console — still bounce to the sign-in page.
    if (!user && SIGNED_IN_ONLY.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.warn("[updateSession] supabase failed:", err);
  }

  return response;
}
