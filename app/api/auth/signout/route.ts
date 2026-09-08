import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // env not configured — still redirect
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
