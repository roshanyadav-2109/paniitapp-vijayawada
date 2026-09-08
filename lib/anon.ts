// Deterministic 4-digit pseudonym for anonymous posters in a session.
// Same user_id → same pseudonym across the session.

export function anonPseudonym(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const n = hash % 9999;
  return `Attendee #${String(n).padStart(4, "0")}`;
}
