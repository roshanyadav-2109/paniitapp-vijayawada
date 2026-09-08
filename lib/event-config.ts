// Single source of truth for event identity (city, venue, dates, branding).
//
// This repo is the Andhra Pradesh / Vijayawada edition of the PAN IIT event
// PWA, forked from the Bangalore summit app. Everything that differs between
// city editions lives here, so a future edition is a one-file change rather
// than a scavenger hunt through JSX.
//
// Values below are taken from the official summit brochure
// ("PanIIT AP Summit Brochure Revised"). The one item still carried over from
// Bangalore is EVENT_VIDEO_URL — see the note on it.

export const EVENT_CITY = "Vijayawada";
export const EVENT_STATE = "Andhra Pradesh";
export const EVENT_NAME = "PanIIT Andhra Pradesh Summit 2026";
export const EVENT_SHORT_NAME = "Andhra Pradesh Summit";
export const EVENT_APP_NAME = "PanIIT AP 2026";

/** Summit theme, from the brochure cover. */
export const EVENT_TAGLINE = "Andhra's Deeptech Decade: Anchored by PanIIT";
export const EVENT_SUBTAGLINE = "Swarna Andhra to Viksit Bharat 2047";

/**
 * Summit day, IST — 3 October 2026.
 *
 * NOT cosmetic: lib/slots.ts builds the entire meeting-availability grid from
 * this date. Changing it moves every generated availability slot.
 */
export const EVENT_DATE_ISO = "2026-10-03";
export const EVENT_DATE_LABEL = "3 October 2026 · all times IST";
export const EVENT_DATE_TEXT = "October 3, 2026";
export const EVENT_DATE_STAT = { value: "3 Oct", hint: "2026" };

export const EVENT_VENUE =
  "Dr. B. R. Ambedkar Kala Vedika, Buckingham Peta, Vijayawada";
export const EVENT_VENUE_SHORT = "Dr. B. R. Ambedkar Kala Vedika";
export const EVENT_VENUE_STAT = { value: "Kala Vedika", hint: "Vijayawada" };
export const EVENT_MAPS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Dr.+B.+R.+Ambedkar+Kala+Vedika+Buckingham+Peta+Vijayawada";

/** Headline delegate count from the brochure's "Event in numbers". */
export const EVENT_ATTENDEE_COUNT = "800+";

/** Focus areas from the brochure cover, used in About copy. */
export const EVENT_FOCUS_AREAS =
  "AI, quantum computing, green energy, deep tech, and startups";

/**
 * TODO — still the Bangalore edition's promo video.
 *
 * This is a signed Supabase Storage URL into the shared project's
 * `Video Files` bucket, kept only so the About screen renders during
 * development. Upload a Vijayawada video and replace this before launch.
 */
export const EVENT_VIDEO_URL =
  "https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/sign/Video%20Files/pan%20iit%20bangalore.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjdkNTg1Yy0yZTIxLTQ1ZWUtOTYxNy1hMjIyYjIyZWZiZTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlbyBGaWxlcy9wYW4gaWl0IGJhbmdhbG9yZS5tcDQiLCJpYXQiOjE3Nzg4NjQxMzQsImV4cCI6NDkzMjQ2NDEzNH0.P3WIJiEyZOBiqf0hYJCiyit7i_S_lAT8ZHbl9NuEYVM";

/**
 * This edition's row in `public.events`.
 *
 * The Bangalore and AP summits share one Supabase project, so every query
 * against an event-scoped table (sessions, venues, sponsors, exhibitors,
 * announcements, meetings, availability, allowlist) must filter on this, and
 * every insert must set it. See supabase/migrations/0013_event_scoping.sql.
 *
 * Overridable via env so a staging deploy can point at another edition.
 */
export const EVENT_ID =
  process.env.NEXT_PUBLIC_EVENT_ID ?? "a9d40000-0000-4000-8000-000000000002";
