import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client with no cookies attached, for the parts of the event
 * that are the same for everybody.
 *
 * The server client in ./server carries the visitor's session, which makes
 * every query it runs personal — correct for bookmarks and meetings, and
 * exactly what stops the programme being shared between visitors. This one
 * reads as `anon` and therefore returns the same rows to everyone, which is
 * what makes the result cacheable.
 *
 * It is read-only by construction: anon holds no write policy on any of the
 * catalogue tables (see migrations 0018 and 0019).
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
