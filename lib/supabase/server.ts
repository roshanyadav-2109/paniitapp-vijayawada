import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { devAuthBypass } from "@/lib/dev-auth";

export async function createClient() {
  // Local review only — see lib/dev-auth.ts.
  //
  // Skipping the sign-in leaves the request with no Supabase session, and
  // every read policy in this schema is `to authenticated` — so speakers,
  // sponsors, sessions, exhibitors and attendees all come back empty and the
  // app renders as though the database were blank. That makes the bypass
  // useless for reviewing anything but an empty state, so in that mode reads
  // go through the service-role client instead.
  //
  // The key is server-only (SUPABASE_SERVICE_ROLE_KEY, not NEXT_PUBLIC_) and
  // devAuthBypass() is false whenever NODE_ENV is "production", so this
  // branch cannot exist in a deployed build.
  if (devAuthBypass() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Called from a Server Component — middleware refreshes cookies, so we can ignore.
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSbClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
