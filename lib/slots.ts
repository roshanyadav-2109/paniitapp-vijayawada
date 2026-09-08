import { formatInTimeZone } from "date-fns-tz";
import { SUMMIT_DATE_ISO, SUMMIT_TZ } from "./constants";

export interface Slot {
  start: string; // ISO
  end: string;   // ISO
}

const DAY_START_H = 8;
const DAY_END_H = 21;
const STEP_MIN = 15;
const SLOT_MIN = 15;

// 15-minute grid for the My Availability flow on /meetings.
// 08:00 IST → 22:00 IST in 15-minute blocks (56 slots total).
const AVAIL_START_H = 8;
const AVAIL_END_H = 22;
const AVAIL_STEP_MIN = 15;
const AVAIL_SLOT_MIN = 15;

export function buildAvailabilitySlots(): Slot[] {
  const slots: Slot[] = [];
  const start = new Date(`${SUMMIT_DATE_ISO}T02:30:00.000Z`); // 08:00 IST
  const totalMin = (AVAIL_END_H - AVAIL_START_H) * 60;
  for (let m = 0; m < totalMin; m += AVAIL_STEP_MIN) {
    const s = new Date(start.getTime() + m * 60_000);
    const e = new Date(s.getTime() + AVAIL_SLOT_MIN * 60_000);
    slots.push({ start: s.toISOString(), end: e.toISOString() });
  }
  return slots;
}

export function slotHourIST(iso: string): number {
  // Return hour as a number in IST (0–23). Anchor: 2026-05-16T02:30Z = 08:00 IST.
  const ms = new Date(iso).getTime();
  const anchor = new Date(`${SUMMIT_DATE_ISO}T00:00:00.000Z`).getTime();
  const istMin = Math.round((ms - anchor) / 60_000) + 5 * 60 + 30; // shift to IST
  return Math.floor(((istMin % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
}

// Build May-16 IST slot grid 08:00–21:00 in 15-minute increments.
export function buildDaySlots(): Slot[] {
  const slots: Slot[] = [];
  // Use a Date constructed in UTC for the summit day, then shift by the IST offset.
  // The IST tz offset is fixed (+05:30), so we anchor to 02:30 UTC = 08:00 IST.
  const start = new Date(`${SUMMIT_DATE_ISO}T02:30:00.000Z`); // 08:00 IST
  for (
    let m = 0;
    m < (DAY_END_H - DAY_START_H) * 60;
    m += STEP_MIN
  ) {
    const s = new Date(start.getTime() + m * 60_000);
    const e = new Date(s.getTime() + SLOT_MIN * 60_000);
    slots.push({ start: s.toISOString(), end: e.toISOString() });
  }
  return slots;
}

export function slotLabel(slot: Slot): string {
  return formatInTimeZone(new Date(slot.start), SUMMIT_TZ, "h:mm a");
}

export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

export type SlotConflict = "free" | "soft" | "hard";

export function classifySlot(
  slot: Slot,
  bookmarkedSessions: { start: string; end: string }[],
  acceptedMeetings: { start: string; end: string }[]
): SlotConflict {
  if (acceptedMeetings.some((m) => overlaps(slot, m))) return "hard";
  if (bookmarkedSessions.some((s) => overlaps(slot, s))) return "soft";
  return "free";
}

interface SuggestInput {
  candidates: Slot[];
  isPickable: (s: Slot) => boolean;
  featured: { start: string; end: string }[];
  inviteeAccepted: { start: string; end: string }[];
  bookmarks: { start: string; end: string }[];
}

// Pick up to 3 well-spread, low-friction times for the invitee.
// Buckets: morning (<12 IST), lunch (12–13 IST), afternoon/evening (>=14 IST).
// Lunch is preferred at a networking event — casual food-table chats convert
// better than cold lobby meets — so it gets a small bonus, not a penalty.
// Penalties: overlapping a featured/keynote session, sitting back-to-back
// against one of the invitee's already-accepted meetings, or colliding with
// the proposer's bookmarked session.
export function suggestThreeSlots(input: SuggestInput): Slot[] {
  const BACK_TO_BACK_MS = 15 * 60_000;

  function score(slot: Slot): number {
    let s = 0;
    if (input.featured.some((f) => overlaps(slot, f))) s += 100;
    if (input.bookmarks.some((b) => overlaps(slot, b))) s += 25;

    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    for (const m of input.inviteeAccepted) {
      const mStart = new Date(m.start).getTime();
      const mEnd = new Date(m.end).getTime();
      // Distance between this slot and that meeting (0 if touching).
      const gap = start >= mEnd ? start - mEnd : mStart >= end ? mStart - end : 0;
      if (gap === 0) continue; // already filtered by isPickable for true overlap
      if (gap < BACK_TO_BACK_MS) s += 10;
    }

    const hour = slotHourIST(slot.start);
    if (hour >= 12 && hour < 14) s -= 2; // gentle lunch bonus
    return s;
  }

  const eligible = input.candidates
    .filter(input.isPickable)
    .map((slot) => ({ slot, score: score(slot), hour: slotHourIST(slot.start) }))
    .sort((a, b) => a.score - b.score || new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime());
  if (eligible.length === 0) return [];

  function pickFromBucket(predicate: (hour: number) => boolean, used: Set<string>): Slot | null {
    for (const e of eligible) {
      if (used.has(e.slot.start)) continue;
      if (predicate(e.hour)) return e.slot;
    }
    return null;
  }

  const used = new Set<string>();
  const picks: Slot[] = [];
  const buckets: ((h: number) => boolean)[] = [
    (h) => h < 12,
    (h) => h >= 12 && h < 14,
    (h) => h >= 14,
  ];
  for (const b of buckets) {
    const pick = pickFromBucket(b, used);
    if (pick) {
      picks.push(pick);
      used.add(pick.start);
    }
  }
  // Backfill if any bucket was empty — keep the best remaining slots.
  for (const e of eligible) {
    if (picks.length >= 3) break;
    if (used.has(e.slot.start)) continue;
    picks.push(e.slot);
    used.add(e.slot.start);
  }
  return picks
    .slice(0, 3)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
