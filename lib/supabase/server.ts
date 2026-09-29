import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  createClient as createSbClient,
  type User,
  type UserResponse,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "./types";
import { devAuthBypass } from "@/lib/dev-auth";

function sessionClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

/**
 * Who is signed in on this request: worked out once, and worked out here.
 *
 * Every screen asked, and asked the auth server: the layout, the viewer
 * check and the page itself each called getUser(), a round trip to Tokyo
 * from the functions in Mumbai, two or three of them before a signed-in
 * page could finish. This project signs its tokens with an asymmetric key
 * (ES256), so the token can be checked against the published public key
 * right here, a millisecond with the key cached across requests, which is
 * what getClaims() does; and React's cache makes it once per request
 * however many things ask.
 *
 * The user it gives back is built from the verified token's claims: the id,
 * email and metadata, which is all anything in the app reads. Where the
 * token cannot be checked locally (none, expired past refresh, or signed
 * the old symmetric way) it asks the auth server as before.
 */
const currentUser = cache(async (): Promise<UserResponse> => {
  const client = sessionClient(await cookies());
  try {
    const { data, error } = await client.auth.getClaims();
    const c = data?.claims;
    if (!error && c?.sub) {
      const user = {
        id: c.sub,
        aud: typeof c.aud === "string" ? c.aud : "authenticated",
        role: c.role,
        email: c.email,
        phone: c.phone,
        app_metadata: c.app_metadata ?? {},
        user_metadata: c.user_metadata ?? {},
        is_anonymous: c.is_anonymous,
        created_at: "",
      } as User;
      return { data: { user }, error: null };
    }
  } catch {
    // fall through to the auth server
  }
  return client.auth.getUser();
});

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

  const client = sessionClient(await cookies());

  // getUser() with no token is "who is signed in", which currentUser
  // answers once per request. With a token it is a question about that
  // token, and goes to the auth server as it always did.
  const viaAuthServer = client.auth.getUser.bind(client.auth);
  client.auth.getUser = ((jwt?: string) =>
    jwt ? viaAuthServer(jwt) : currentUser()) as typeof client.auth.getUser;

  return client;
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
