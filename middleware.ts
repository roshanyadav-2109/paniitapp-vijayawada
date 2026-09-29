import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    return await updateSession(request);
  } catch (err) {
    console.warn("[middleware] failed, passing request through:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - manifest.json, sw.js, icons/*
     * - any file of artwork, type or script by its extension. Every picture
     *   on a screen was a trip through here to read the session for nothing,
     *   and a sign-in rule could catch one (it did: /media).
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icons|manifest.json|sw.js|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|pdf|txt|xml|js|css|map)$).*)",
  ],
};
