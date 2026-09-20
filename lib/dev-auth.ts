/**
 * Local review escape hatch — never active in a deployment.
 *
 * Reviewing /home, /agenda and the rest normally means a real Google sign-in,
 * which is not possible in every environment. With DEV_SKIP_AUTH=1 in
 * .env.local the auth redirects are skipped and pages render with no user:
 * the profile-dependent bits fall back to their empty states, which is enough
 * to check layout and styling.
 *
 * Both conditions must hold, and either alone would be sufficient:
 *  - `next build` sets NODE_ENV to "production", so this is dead code in any
 *    deployed build no matter what environment variables are set.
 *  - The flag lives in .env.local, which .vercelignore keeps out of the
 *    upload, so it cannot ride along to Vercel in the first place.
 */
export function devAuthBypass(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1"
  );
}
