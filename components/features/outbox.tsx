"use client";

/**
 * Online-only compatibility helpers.
 *
 * Call sites still use sendOrQueue while the app's actions converge, but the
 * offline queue has intentionally been removed: failed writes are returned to
 * the caller and are not stored or retried in the background.
 */
export type OutboxJob = Record<string, unknown>;

export function isNetworkFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err ?? "");
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed|timeout/i.test(msg);
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function queue(_job: OutboxJob): Promise<boolean> {
  void _job;
  return false;
}

export async function sendOrQueue<T>(_job: OutboxJob, send: () => Promise<T>): Promise<T> {
  return send();
}
