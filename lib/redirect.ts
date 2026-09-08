/**
 * Next.js `redirect()` throws a special error with `digest` starting with
 * "NEXT_REDIRECT" — if it's caught in a try/catch, the redirect is swallowed.
 * Use this to rethrow it explicitly inside catch blocks that exist for other
 * reasons (e.g. tolerating missing Supabase env vars at build time).
 */
export function rethrowIfRedirect(err: unknown): void {
  if (
    err !== null &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  ) {
    throw err;
  }
}
