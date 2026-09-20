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

    const { pathname } = request.nextUrl;

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
