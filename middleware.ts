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
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icons|manifest.json|sw.js).*)",
  ],
};
