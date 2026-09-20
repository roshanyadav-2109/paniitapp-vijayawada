/**
 * Show every screen as if the database were empty.
 *
 * For looking at the empty states without deleting anything: the summit's
 * sessions, venues, attendees and exhibitors stay exactly where they are,
 * and the screens render as they will on the day a table is genuinely bare.
 *
 * Set DEV_EMPTY=1 in .env.local and restart. Guarded by NODE_ENV as well,
 * so it cannot do this to a deployment even if the variable escapes.
 */
export function devEmptyMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_EMPTY === "1";
}

/** `list` normally; nothing while the preview is on. */
export function emptied<T>(list: T[]): T[] {
  return devEmptyMode() ? [] : list;
}
