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
export const EVENT_TAGLINE =
  "Andhra's Resilient Deeptech Decade: Anchored by PanIIT";
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
  "AI, quantum computing, semiconductors, defence and space, green energy, " +
  "biotech, and agri-tech";

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

/**
 * Folder prefix inside the shared `LOGOS` storage bucket.
 *
 * Storage is NOT event-scoped the way the database now is — the bucket has
 * tier folders ("Title Sponsor", "Gold Sponsor", ...) at its root, holding
 * the Bangalore edition's logos. Reading those directly would show Bangalore's
 * sponsors here, so this edition reads from `ap-2026/<tier>/` instead.
 *
 * Upload AP sponsor logos to `ap-2026/Title Sponsor/` etc. Until then the
 * sponsor board is empty, which is the correct state — better blank than
 * showing another summit's partners.
 */
export const EVENT_STORAGE_PREFIX = "ap-2026";

/**
 * Home-screen hero carousel.
 *
 * TODO — these are still the Bangalore edition's promotional banners and
 * guest-panel photos, hosted on the PanIIT S3 bucket. Replace with AP artwork
 * before launch.
 */
export const EVENT_HERO_SLIDES: {
  src: string;
  alt: string;
  /** Optional overlay caption. Set both to label a person on the banner. */
  name?: string;
  role?: string;
}[] = [
  {
    // The one genuinely AP banner we have, so it leads. Re-hosted rather than
    // hotlinked from the almashines CDN.
    src: "https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/hero-registration.webp",
    alt: "PanIIT Andhra Pradesh Summit 2026 — 3 October 2026, Dr. B. R. Ambedkar Kala Vedika, Vijayawada. Registration open.",
  },
  {
    // Poster composition: subject cut out with a segmentation model, placed on
    // the brand ground with the name set beside them. Text is part of the
    // artwork, so these slides carry no overlay caption.
    src: "https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/hero-swadeep.webp",
    alt: "Swadeep Pillarisetti, Co-Chair of the PanIIT Andhra Pradesh Summit 2026",
  },
  {
    src: "https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/hero-cm.webp",
    alt: "Sri Nara Chandra Babu Naidu, Hon'ble Chief Minister of Andhra Pradesh",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_359/pan_image_1_1_50.png",
    alt: "PanIIT Andhra Pradesh Summit 2026 — promotional banner 1",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_359/pan_image_2_50.png",
    alt: "PanIIT Andhra Pradesh Summit 2026 — promotional banner 2",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_2567/PANIITGuestpanel1.png",
    alt: "PanIIT Andhra Pradesh Summit 2026 — guest panel 1",
  },
  {
    src: "https://afilemanager.s3.dualstack.ap-southeast-1.amazonaws.com/prod/cid_2567/PANIITpanel2.png",
    alt: "PanIIT Andhra Pradesh Summit 2026 — guest panel 2",
  },
];


/**
 * Session themes — the summit's eight sector tracks.
 *
 * Source: "SESSION THEMES" (p.14) of the 11/09/26 brochure, cross-referenced
 * with the programme schedule (p.9) so each sector names the block it
 * actually runs in rather than sitting on the page as decoration.
 *
 * `image` files are cropped from that brochure page and converted to WebP;
 * see public/sectors/. They are photographic and wildly different in palette
 * (violet AI, gold quantum, green fields), which is why the UI renders them
 * duotone at rest — see SectorGrid.
 */
export interface EventSector {
  slug: string;
  label: string;
  /** The programme block this sector runs in, from the schedule. */
  slot: string;
  /** One line on what the sector covers, for the detail row. */
  blurb: string;
  image: string;
}

export const EVENT_SECTORS: EventSector[] = [
  {
    slug: "ai-governance",
    label: "AI in Governance",
    slot: "3:00 PM · Address & talks",
    blurb: "Putting AI to work inside the machinery of the state.",
    image: "/sectors/ai-governance.webp",
  },
  {
    slug: "quantum",
    label: "Quantum Computing",
    slot: "Panel 2 · 10:45 AM",
    blurb:
      "Deep tech in all walks of life — quantum, semiconductors and AI.",
    image: "/sectors/quantum.webp",
  },
  {
    slug: "semiconductors",
    label: "Semiconductors",
    slot: "Panel 2 · 10:45 AM",
    blurb: "Fabs, packaging and the Made-in-India silicon supply chain.",
    image: "/sectors/semiconductors.webp",
  },
  {
    slug: "defence-space",
    label: "Defence & SpaceTech",
    slot: "Panel 3 · 11:30 AM",
    blurb: "Space and defence manufacturing, built for product perfection.",
    image: "/sectors/defence-space.webp",
  },
  {
    slug: "biovalley",
    label: "BioValley",
    slot: "Panel 4 · 12:15 PM",
    blurb: "Health access and screening at scale — towards zero poverty.",
    image: "/sectors/biovalley.webp",
  },
  {
    slug: "green-energy",
    label: "Green Energy",
    slot: "Panel 1 · 10:00 AM",
    blurb: "Energy and fuel cost optimisation for a Swachh Andhra.",
    image: "/sectors/green-energy.webp",
  },
  {
    slug: "agritech",
    label: "AgriTech",
    slot: "Panel 5 · 2:00 PM",
    blurb: "Farmers and water security, instrumented.",
    image: "/sectors/agritech.webp",
  },
  {
    slug: "skilling",
    label: "Skilling & Entrepreneurship",
    slot: "2:45 PM · IIT Madras Pravartak",
    blurb: "Turning Andhra's youth into a globally competitive talent pool.",
    image: "/sectors/skilling.webp",
  },
];

/**
 * "Event in numbers" (brochure p.2). Shown on the About screen.
 */
export const EVENT_NUMBERS: { value: string; label: string }[] = [
  { value: "800+", label: "Delegates" },
  { value: "50+", label: "Corporate CEOs & senior CXOs" },
  { value: "100+", label: "Unicorn founders & startup leaders" },
  { value: "50+", label: "Investors, VCs & family offices" },
];

/**
 * Who the summit is for (brochure p.1, "Who will attend?").
 */
export const EVENT_AUDIENCE: { name: string; body: string }[] = [
  {
    name: "Corporate CEOs & CXOs",
    body: "Operators from large Indian and global enterprises with deep-tech roots.",
  },
  {
    name: "Investors & VCs",
    body: "Angels, VC partners, family offices and growth funds with an India focus.",
  },
  {
    name: "IIT directors & global alumni",
    body: "Directors, faculty and working alumni across all 23 IIT campuses.",
  },
  {
    name: "Policy makers",
    body: "Government, regulators and industry bodies shaping technology policy.",
  },
  {
    name: "Startup founders",
    body: "Early- to growth-stage builders in deep tech, AI, climate and consumer.",
  },
];

/**
 * Summit vision (brochure p.6). Used on the About screen.
 */
export const EVENT_VISION: string[] = [
  "Showcasing Andhra Pradesh as a hub of skilled talent, innovation, global collaboration and strategic investment.",
  "Aligning with Swarna Andhra 2047 and Viksit Bharat 2047 to build a globally competitive, future-ready innovation ecosystem.",
  "Catalysing AI, quantum computing, green energy, deep-tech innovation, startups and entrepreneurship.",
  "Transforming Andhra Pradesh's youth into a globally competitive talent pool for emerging industries.",
  "Connecting global IIT alumni, industry leaders, policymakers and academia to drive innovation-led growth.",
];

/**
 * Summit organising contacts (brochure p.28).
 */
export const EVENT_CONTACTS: {
  name: string;
  role?: string;
  phone: string;
  email?: string;
}[] = [
  {
    name: "Padmini Padhy",
    role: "PanIIT Secretariat",
    phone: "+919711195445",
    email: "secretariat@paniit.org",
  },
  {
    name: "Sanskreeti Raj",
    role: "PanIIT Secretariat",
    phone: "+919835419705",
    email: "sanskreeti.raj@paniit.org",
  },
  { name: "Sai Teja Duggempudi", phone: "+918418944154" },
  { name: "Gadi Akhil Sai Ram", phone: "+919491080512" },
  { name: "Thejaswini Kalasamudram", phone: "+917893796502" },
  { name: "Kshitij Tiwari", phone: "+918840075327" },
];
