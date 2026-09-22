// Single source of truth for event identity (city, venue, dates, branding).
//
// This repo is the Andhra Pradesh / Vijayawada edition of the PAN IIT event
// PWA, forked from the Bangalore summit app. Everything that differs between
// city editions lives here, so a future edition is a one-file change rather
// than a scavenger hunt through JSX.
//
// Values below are taken from the official summit brochure
// ("PanIIT AP Summit Brochure Revised") and the 11/09/26 revision.

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

/**
 * Footfall across the day, which is not the same number as the delegate
 * count: the brochure's 800+ is registered delegates, while the halls and
 * the expo floor see visitors on top of them.
 */
export const EVENT_VISITOR_COUNT = "2000+";

/** Focus areas from the brochure cover, used in About copy. */
export const EVENT_FOCUS_AREAS =
  "AI, quantum computing, semiconductors, defence and space, green energy, " +
  "biotech, and agri-tech";

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
 * All AP artwork now. The four Bangalore promotional banners and guest-panel
 * photos that were hotlinked from the old PanIIT S3 bucket are gone — one of
 * them read "PanIIT Bangalore Summit 2026, Taj Yeshwanthpur, Bangalore" in
 * plain text, and the carousel rotated onto it by itself.
 */
export const EVENT_HERO_SLIDES: {
  src: string;
  alt: string;
  /** Optional overlay caption. Set both to label a person on the banner. */
  name?: string;
  role?: string;
}[] = [
  {
    // Self-hosted on purpose. This came from a LinkedIn CDN URL whose query
    // string carries an expiry — hotlinking it would have worked today and
    // broken the top of the home screen in a few weeks.
    src: "/hero/innovation-showcase.webp",
    alt: "Call for Innovation Showcase at the PanIIT Andhra Pradesh Summit 2026 — 3 October 2026, Dr. B. R. Ambedkar Kala Vedika, Vijayawada. Limited stalls, apply now.",
  },
  {
    // Same reason as above: self-hosted rather than hotlinked from a LinkedIn
    // CDN URL that carries an expiry in its query string.
    src: "/hero/press-conference.webp",
    alt: "PanIIT Andhra Pradesh Summit 2026 press conference — Catalyzing Innovation for Swarna Andhra Vision 2047.",
  },
  {
    // Also self-hosted — the LinkedIn CDN URL it came from carries an expiry.
    src: "/hero/lokesh-brochure.webp",
    alt: "Sri Nara Lokesh, Minister for IT, receiving the PanIIT Andhra Pradesh Summit 2026 brochure from the organising team.",
  },
  {
    // Stills from the I&PR AP press conference on YouTube (AVu3iHc925s), at
    // 24:42 and 25:30 — the stretch where Swadeep Pillarisetti holds the mic.
    // Finding that window meant scanning the 52 minutes as contact sheets;
    // picking on sharpness alone had landed on the speaker either side of
    // him, which is a different person entirely. Scored on sharpness and on
    // face size, so these are portraits of him rather than wide shots of the
    // table, and kept 35s apart so they are two moments not two frames.
    src: "/hero/swadeep-speaking.webp",
    alt: "Swadeep Pillarisetti, Co-Chair of the PanIIT Andhra Pradesh Summit 2026, speaking at the press conference.",
  },
  {
    src: "/hero/swadeep-briefing.webp",
    alt: "Swadeep Pillarisetti briefing the press at the Government of Andhra Pradesh information centre.",
  },
  {
    // The one genuinely AP banner we have, so it leads. Re-hosted rather than
    // hotlinked from the almashines CDN.
    src: "https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/hero-registration.webp",
    alt: "PanIIT Andhra Pradesh Summit 2026 — 3 October 2026, Dr. B. R. Ambedkar Kala Vedika, Vijayawada. Registration open.",
  },
];

/**
 * Focussed sectors — the subject areas the summit's sessions cover.
 *
 * Sector names follow "SESSION THEMES" (p.14) of the 11/09/26 brochure.
 *
 * Deliberately no session times here. These name what a session is *about*,
 * not when it runs, and pinning a panel number to each one said the wrong
 * thing — several sectors are discussed across more than one block.
 *
 * `image` files are the supplied illustrations with their grounds matted out
 * (u2net, via rembg), so they sit on the page rather than inside a dark
 * square. See public/sectors/.
 */
export interface EventSector {
  slug: string;
  label: string;
  /** One line on what the sector covers, for the detail row. */
  blurb: string;
  image: string;
}

export const EVENT_SECTORS: EventSector[] = [
  {
    slug: "ai-governance",
    label: "AI in Governance",
    blurb: "Putting AI to work inside the machinery of the state.",
    image: "/sectors/ai-governance.webp",
  },
  {
    slug: "quantum",
    label: "Quantum Computing",
    blurb: "Deep tech in all walks of life — quantum, semiconductors and AI.",
    image: "/sectors/quantum.webp",
  },
  {
    slug: "semiconductors",
    label: "Semiconductors",
    blurb: "Fabs, packaging and the Made-in-India silicon supply chain.",
    image: "/sectors/semiconductors.webp",
  },
  {
    slug: "defence-space",
    label: "Defence & SpaceTech",
    blurb: "Space and defence manufacturing, built for product perfection.",
    image: "/sectors/defence-space.webp",
  },
  {
    slug: "biovalley",
    label: "BioValley",
    blurb: "Health access and screening at scale — towards zero poverty.",
    image: "/sectors/biovalley.webp",
  },
  {
    slug: "green-energy",
    label: "Green Energy",
    blurb: "Energy and fuel cost optimisation for a Swachh Andhra.",
    image: "/sectors/green-energy.webp",
  },
  {
    slug: "agritech",
    label: "AgriTech",
    blurb: "Farmers and water security, instrumented.",
    image: "/sectors/agritech.webp",
  },
  {
    slug: "skilling",
    label: "Skilling & Entrepreneurship",
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
export const EVENT_AUDIENCE: {
  name: string;
  body: string;
  /** Red mark from the brochure's "Who will attend?" row (p.1). */
  icon: string;
}[] = [
  {
    name: "Corporate CEOs & CXOs",
    icon: "/audience/ceos.webp",
    body: "Operators from large Indian and global enterprises with deep-tech roots.",
  },
  {
    name: "Investors & VCs",
    icon: "/audience/investors.webp",
    body: "Angels, VC partners, family offices and growth funds with an India focus.",
  },
  {
    name: "IIT directors & global alumni",
    icon: "/audience/directors.webp",
    body: "Directors, faculty and working alumni across all 23 IIT campuses.",
  },
  {
    name: "Policy makers",
    icon: "/audience/policy.webp",
    body: "Government, regulators and industry bodies shaping technology policy.",
  },
  {
    name: "Startup founders",
    icon: "/audience/founders.webp",
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

/**
 * PAN IIT's social accounts — the single source of truth for these links.
 *
 * Previously the home screen and the top bar each carried their own list, and
 * they disagreed on all three shared platforms. Checked against the footer of
 * paniit.org, which is authoritative, and then each URL was opened:
 *
 *   instagram.com/paniit_alumni_india  -> "Profile isn't available" (dead)
 *   x.com/paniit_india                 -> HTTP 404 (dead)
 *   linkedin.com/company/paniitalumni  -> reCAPTCHA wall, unverifiable
 *   youtube.com/@paniitalumniindia     -> a real but DIFFERENT channel,
 *                                         "PanIITAlumniIndia", not the one
 *                                         paniit.org links to
 *
 * The values below are the ones paniit.org itself links to, each confirmed:
 * LinkedIn resolves to "PanIIT Alumni India", Instagram to "PAN IIT Alumni
 * India (@paniitindia)", YouTube to "PAN IIT ALUMNI INDIA". Facebook answers
 * 400 to automated requests, as it does for everything, so it is trusted on
 * paniit.org's say-so rather than independently confirmed.
 */
export interface EventSocial {
  key: "linkedin" | "instagram" | "x" | "youtube" | "facebook";
  label: string;
  href: string;
}

export const EVENT_SOCIALS: EventSocial[] = [
  {
    key: "linkedin",
    label: "PAN IIT on LinkedIn",
    href: "https://www.linkedin.com/company/paniit",
  },
  {
    key: "instagram",
    label: "PAN IIT on Instagram",
    href: "https://www.instagram.com/paniitindia",
  },
  { key: "x", label: "PAN IIT on X", href: "https://x.com/paniitindia" },
  {
    key: "youtube",
    label: "PAN IIT on YouTube",
    href: "https://www.youtube.com/@PANIITIndia",
  },
  {
    key: "facebook",
    label: "PAN IIT on Facebook",
    href: "https://www.facebook.com/paniitindia",
  },
];

/** Summit help group. Event-specific, not a PAN IIT account. */
export const EVENT_WHATSAPP_URL =
  "https://chat.whatsapp.com/DFwlo56dAu83SW6fKX4I7H";

/**
 * Summit highlights — the nine things that happen on the day.
 *
 * Source: "SUMMIT HIGHLIGHTS" (p.13) of the 11/09/26 brochure, which
 * represents each one with a photo tile exactly as p.14 does for the session
 * themes. Tiles cropped from that page and converted to WebP; see
 * public/highlights/. Rendered through the same duotone grid as the sectors,
 * so the two sets read as one system rather than two stock-photo walls.
 */
export const EVENT_HIGHLIGHTS: {
  slug: string;
  label: string;
  image: string;
}[] = [
  {
    slug: "grand-opening",
    label: "Grand opening ceremony",
    image: "/highlights/grand-opening.webp",
  },
  {
    slug: "keynotes",
    label: "Visionary keynotes",
    image: "/highlights/keynotes.webp",
  },
  {
    slug: "policy-papers",
    label: "Policy & vision papers",
    image: "/highlights/policy-papers.webp",
  },
  {
    slug: "leadership",
    label: "Leadership panels",
    image: "/highlights/leadership.webp",
  },
  {
    slug: "roundtables",
    label: "Strategic roundtables",
    image: "/highlights/roundtables.webp",
  },
  {
    slug: "startup-expo",
    label: "Innovation & startup expo",
    image: "/highlights/startup-expo.webp",
  },
  {
    slug: "networking",
    label: "Global networking",
    image: "/highlights/networking.webp",
  },
  {
    slug: "executive-lunch",
    label: "Executive lunch",
    image: "/highlights/executive-lunch.webp",
  },
  {
    slug: "valedictory",
    label: "Valedictory address by the Hon'ble Chief Minister",
    image: "/highlights/valedictory.webp",
  },
];

/**
 * The 23 IITs, for the marquee under the About section on the home screen.
 *
 * `logo` points at public/iits/<slug>.webp. The marks were taken from each
 * institute's English Wikipedia article and trimmed to a common 200x120 box —
 * scaled to FIT that box, not to its width, so a tall crest and a wide
 * wordmark carry the same visual weight in the row. Sources are listed in
 * public/iits/SOURCES.md.
 *
 * These are trademarks, used here to identify the institutes taking part.
 * If PanIIT's own brand kit has official artwork, prefer it — the filenames
 * are all that need to match.
 *
 * Ordered by year of establishment, oldest first, which is the order these
 * are conventionally listed in.
 */
export const EVENT_IITS: { slug: string; name: string; logo: string }[] = [
  { slug: "kharagpur", name: "IIT Kharagpur", logo: "/iits/kharagpur.webp" },
  { slug: "bombay", name: "IIT Bombay", logo: "/iits/bombay.webp" },
  { slug: "madras", name: "IIT Madras", logo: "/iits/madras.webp" },
  { slug: "kanpur", name: "IIT Kanpur", logo: "/iits/kanpur.webp" },
  { slug: "delhi", name: "IIT Delhi", logo: "/iits/delhi.webp" },
  { slug: "guwahati", name: "IIT Guwahati", logo: "/iits/guwahati.webp" },
  { slug: "roorkee", name: "IIT Roorkee", logo: "/iits/roorkee.webp" },
  { slug: "ropar", name: "IIT Ropar", logo: "/iits/ropar.webp" },
  {
    slug: "bhubaneswar",
    name: "IIT Bhubaneswar",
    logo: "/iits/bhubaneswar.webp",
  },
  {
    slug: "gandhinagar",
    name: "IIT Gandhinagar",
    logo: "/iits/gandhinagar.webp",
  },
  { slug: "hyderabad", name: "IIT Hyderabad", logo: "/iits/hyderabad.webp" },
  { slug: "jodhpur", name: "IIT Jodhpur", logo: "/iits/jodhpur.webp" },
  { slug: "patna", name: "IIT Patna", logo: "/iits/patna.webp" },
  { slug: "indore", name: "IIT Indore", logo: "/iits/indore.webp" },
  { slug: "mandi", name: "IIT Mandi", logo: "/iits/mandi.webp" },
  {
    slug: "varanasi-bhu",
    name: "IIT (BHU) Varanasi",
    logo: "/iits/varanasi-bhu.webp",
  },
  { slug: "palakkad", name: "IIT Palakkad", logo: "/iits/palakkad.webp" },
  { slug: "tirupati", name: "IIT Tirupati", logo: "/iits/tirupati.webp" },
  { slug: "dhanbad", name: "IIT (ISM) Dhanbad", logo: "/iits/dhanbad.webp" },
  { slug: "bhilai", name: "IIT Bhilai", logo: "/iits/bhilai.webp" },
  { slug: "goa", name: "IIT Goa", logo: "/iits/goa.webp" },
  { slug: "jammu", name: "IIT Jammu", logo: "/iits/jammu.webp" },
  { slug: "dharwad", name: "IIT Dharwad", logo: "/iits/dharwad.webp" },
];

/** Slugs the marquee expects, so the filenames can be prepared up front. */
export const EVENT_IIT_SLUGS = [
  "kharagpur",
  "bombay",
  "madras",
  "kanpur",
  "delhi",
  "guwahati",
  "roorkee",
  "ropar",
  "bhubaneswar",
  "gandhinagar",
  "hyderabad",
  "jodhpur",
  "patna",
  "indore",
  "mandi",
  "varanasi-bhu",
  "palakkad",
  "tirupati",
  "dhanbad",
  "bhilai",
  "goa",
  "jammu",
  "dharwad",
] as const;

/**
 * The video embedded on the home screen.
 *
 * `isLive` decides how it behaves, because the two cases want opposite
 * things. A live stream should start on its own, muted, and be labelled as
 * live. A recording should not: autoplaying a 40-minute press conference the
 * moment someone opens the app is intrusive and spends their mobile data
 * without asking.
 *
 * On summit day, point `id` at the live stream and flip `isLive` to true.
 *
 * Currently the Amaravati Quantum Valley press conference from I&PR AP, the
 * state government's channel. It replaced the Bangalore edition's summit
 * video, which was still embedded here.
 */
export const EVENT_VIDEO_EMBED = {
  id: "AVu3iHc925s",
  isLive: false,
  heading: "Media coverage",
  caption:
    "Press conference by Sri C. V. Sridhar, Mission Director, Amaravati Quantum Valley",
};

/**
 * Photographs for the media gallery — dignitaries, press coverage, past
 * summits. Files live in public/media/.
 *
 * Empty for now, so the carousel renders nothing rather than an empty frame.
 * Pictures can be added a few at a time; the section appears with the first
 * one. `alt` is required and is not optional politeness — it is what a
 * screen reader gets instead of the photograph.
 */
export interface EventMediaItem {
  src: string;
  alt: string;
  caption?: string;
}

export const EVENT_MEDIA: EventMediaItem[] = [
  {
    src: "/media/cm-iit-book.webp",
    // Named only where identification is certain: the Chief Minister is
    // confirmed against his portrait on p.3 of the brochure. The two
    // presenting the book are not named rather than guessed at.
    alt: "Sri Nara Chandra Babu Naidu, Hon'ble Chief Minister of Andhra Pradesh, being presented a book on the IITs",
  },
];

/**
 * Press coverage of the summit.
 *
 * Every URL here was opened and its page title read back before being added —
 * a dead link under a "Media coverage" heading is worse than an empty
 * section. Re-check them if this ships much later; news sites reorganise.
 *
 * Headline, summary and preview image are each outlet's own Open Graph
 * metadata, read from the page and mirrored locally rather than hotlinked —
 * a remote preview image is one CDN change away from a hole in the page.
 *
 * Two of the images are the outlet's logo rather than a photograph. That is
 * what those sites serve as their og:image, and substituting something nicer
 * would be inventing a preview they did not publish.
 *
 * No publication dates: not reliably readable from the pages, and a guessed
 * date on a press link is worse than none.
 */
export interface EventPressItem {
  outlet: string;
  headline: string;
  summary: string;
  /** The outlet's own preview image, mirrored locally. Null where the site
   *  blocks hotlinking — the card then runs without one. */
  image: string | null;
  href: string;
}

export const EVENT_PRESS: EventPressItem[] = [
  {
    outlet: "ThePrint",
    headline:
      "PanIIT summit in Andhra to rope in over 50 CEOs, 100 unicorn founders",
    summary:
      "Amaravati, Sep 18 (PTI) The Andhra Pradesh government in association with PanIIT Alumni India will organise a summit on October 2 and 3 in Vijayawada, which will…",
    image: "/press/theprint-ceos.webp",
    href: "https://theprint.in/india/paniit-summit-in-andhra-to-rope-in-over-50-ceos-100-unicorn-founders/3046873/",
  },
  {
    outlet: "The Hans India",
    headline: "PanIIT summit to position AP as DeepTech hub",
    summary:
      "IITs, industry and govt to map AI, semiconductor, quantum opportunitiesSummit to explore DeepTech investment, startup and skill-development mechanisms",
    image: "/press/hans-deeptech.webp",
    href: "https://www.thehansindia.com/news/cities/amaravati/paniit-summit-to-position-ap-as-deeptech-hub-1121253",
  },
  {
    outlet: "Deccan Chronicle",
    headline: "Naidu, Lokesh To Lead Pan-IIT Summit on AP's DeepTech Ambitions",
    summary:
      "Naidu, Lokesh to lead October 3 summit focused on technology-led growth and investment",
    image: "/press/deccan-naidu.webp",
    href: "https://www.deccanchronicle.com/southern-states/andhra-pradesh/naidu-lokesh-to-lead-pan-iit-summit-on-aps-deeptech-ambitions-1986808",
  },
  {
    outlet: "The Rahnuma Daily",
    headline: "PanIIT AP SUMMIT TO SHOWCASE STATE AS DEEP TECH HUB",
    summary:
      "Vijayawada, Aug.26 (RAHNUMA): PanIIT Alumni India will host the PanIIT Andhra Pradesh Summit 2026 on October 3 at Novotel Vijayawada Varun, bringing together…",
    image: "/press/rahnuma-hub.webp",
    href: "https://therahnuma.com/paniit-ap-summit-to-showcase-state-as-deep-tech-hub",
  },
];

/**
 * Posts about the summit on X.
 *
 * Rendered as our own cards, not through X's embed widget. The widget is
 * ~100KB of third-party JavaScript per page that reflows as it loads, sets
 * cookies, and renders nothing at all for anyone whose network blocks it —
 * for five posts on a page people open at a venue on mobile data, that is a
 * bad trade. Text, author and image are read from the post itself and the
 * images are mirrored into public/x, so a card looks the same whether or not
 * x.com is reachable.
 *
 * `text` is each post verbatim, with two edits: trailing blocks of @mentions
 * and hashtags are dropped (they are routing, not writing, and read as noise
 * in a card), and where a post is longer than the public API will return, it
 * is cut at a sentence end rather than shown trailing off mid-word. Nothing
 * is paraphrased — the card links to the post for the rest.
 *
 * Note the venue drift in the official posts: the state accounts say
 * "Amaravati", the organiser's curtain raiser says "Novotel Vijayawada
 * Varun", and the summit's own poster says Dr. B. R. Ambedkar Kala Vedika,
 * Vijayawada — which is what EVENT_VENUE says. The quotes are left as
 * written; editing someone's post to match our own copy would be worse.
 */
export interface EventPost {
  /** Handle without the @. Also names the mirrored avatar. */
  handle: string;
  name: string;
  /**
   * The badge X actually shows on the account: blue for an individual,
   * gold for a verified organisation, null for neither. Painting them all
   * blue would put a badge on accounts that do not have one and the wrong
   * badge on the ones that do.
   */
  badge: "blue" | "gold" | null;
  avatar: string;
  /** Already formatted — no client-side date maths for six fixed posts. */
  date: string;
  /** When it was posted. The strip sorts on this; `date` is only shown. */
  at: string;
  text: string;
  image: string;
  imageAlt: string;
  /** The post is a video; `image` is the frame X shows for it. */
  video?: boolean;
  href: string;
}

export const EVENT_POSTS: EventPost[] = [
  {
    handle: "ANI",
    name: "ANI",
    badge: "gold",
    avatar: "/x/avatar-ani.webp",
    date: "18 Sep 2026",
    at: "2026-09-18T12:10:53Z",
    text: "#WATCH | Amaravati, Andhra Pradesh: On the Pan-IIT programme to be held on October 3, Chairman, Pan IIT Alumni, Swadeep Pillarisetti, says, “Chandrababu Naidu is one of the most dynamic Chief Ministers in the country...for the first time, Pan-IIT, which is the largest organization of all IITians—500,000 IITians in the country—are coming together...major industry leaders are attending...more than 25 CXOs and CEOs from across the country are coming, along with over 2,000 delegates...the main motive of this program is to bring experts from across the country to see how we can transform Amaravati and Andhra Pradesh into a deep-tech state.”",
    image: "/x/ani-swadeep.webp",
    imageAlt:
      "Swadeep Pillarisetti of PanIIT Alumni India speaking to an ANI reporter in Amaravati.",
    video: true,
    href: "https://x.com/ANI/status/2100920492240904473",
  },
  {
    handle: "ncbn",
    name: "N Chandrababu Naidu",
    badge: "blue",
    avatar: "/x/avatar-ncbn.webp",
    date: "15 Sep 2026",
    at: "2026-09-15T09:39:13Z",
    text: "The energy, enterprise and ideas of our youth are the driving force behind our vision for a Swarna Andhra Pradesh!\nI look forward to joining the PanIIT Andhra Pradesh Summit 2026 in Vijayawada on October 3.\nAndhra Pradesh is emerging as a hub for the technologies that will shape the future, from AI and quantum computing to deep-tech, space-tech, clean energy, data centres and advanced manufacturing. Here, we are building an ecosystem where talent finds opportunity & technology drives growth.\nI invite our young innovators, entrepreneurs, IIT alumni and technology leaders to be part of this journey. Bring your ideas, expertise and ambition.",
    image: "/x/cm-invite.webp",
    imageAlt:
      "Call for Innovation Expo stalls at the PanIIT Andhra Pradesh Summit 2026, 3 October 2026 at Dr. B. R. Ambedkar Kala Vedika, Vijayawada.",
    href: "https://x.com/ncbn/status/2099795162809647190",
  },
  {
    handle: "apdigitalcorp",
    name: "AP Official News",
    badge: null,
    avatar: "/x/avatar-apdigitalcorp.webp",
    date: "16 Sep 2026",
    at: "2026-09-16T02:51:39Z",
    text: "PAN IIT Andhra Pradesh Summit 2026\nVenue: Amaravati | 3 October\nIndia's resilient deeptech decade: anchored by PanIIT\nSwarna Andhra and Viksit Bharat 2047",
    image: "/x/ap-jobs.webp",
    imageAlt:
      "Summit poster on AI-powered opportunities in Andhra Pradesh and a target of 1,00,000 additional direct IT jobs by 2029.",
    href: "https://x.com/apdigitalcorp/status/2100054982007681163",
  },
  {
    handle: "IPR_AP",
    name: "I & PR Andhra Pradesh",
    badge: null,
    avatar: "/x/avatar-ipr_ap.webp",
    date: "12 Sep 2026",
    at: "2026-09-12T06:38:28Z",
    text: "PAN IIT Andhra Pradesh Summit 2026\nAmaravati | 3 October\n23 IITs. One Convergence. One Vision.\nBringing together IIT alumni, technology leaders, innovators and entrepreneurs to drive DeepTech, AI and Quantum Technology and build a Swarna Andhra aligned with Viksit Bharat 2047.",
    image: "/x/ipr-poster.webp",
    imageAlt:
      "Summit poster: 23 IITs global convergence, uniting 23 institutes, a 500,000-strong alumni network and 800+ delegates.",
    href: "https://x.com/IPR_AP/status/2098662512535507198",
  },
  {
    handle: "paniitindia",
    name: "Pan IIT Alumni India",
    badge: "blue",
    avatar: "/x/avatar-paniitindia.webp",
    date: "26 Aug 2026",
    at: "2026-08-26T12:16:55Z",
    text: "Curtain raiser for \u201cPanIIT Andhra Pradesh Summit 2026\u201d sets the stage for a landmark innovation summit in Vijayawada! Chief Guest: Hon'ble AP CM Sri Nara Chandrababu Naidu Garu ji.",
    image: "/x/curtain-raiser.webp",
    imageAlt:
      "The curtain raiser press conference for the PanIIT Andhra Pradesh Summit 2026, under a banner reading Catalyzing Innovation for Swarna Andhra Vision 2047.",
    href: "https://x.com/paniitindia/status/2092587091389493631",
  },
  {
    handle: "paniitindia",
    name: "Pan IIT Alumni India",
    badge: "blue",
    avatar: "/x/avatar-paniitindia.webp",
    date: "26 Aug 2026",
    at: "2026-08-26T06:36:03Z",
    text: "Hon'ble CM of Andhra Pradesh, Sri Nara Chandrababu Naidu, received PanIIT's Shri Prabhat Kumar, Chairman & Dr. Amitabh Ranjan, Vice Chairman, who invited him as Chief Guest for the PanIIT Andhra Pradesh Summit in Amaravati. He envisioned PanIIT as a nodal platform linking AP with all IITs & proposed a PanIIT Centre of Excellence.",
    image: "/x/cm-meeting.webp",
    imageAlt:
      "The Chief Minister of Andhra Pradesh with PanIIT Alumni India's Chairman and Vice Chairman, holding the summit brochure.",
    href: "https://x.com/paniitindia/status/2092501307072614716",
  },
];

/**
 * Speakers past PanIIT summits have hosted, as listed on the summit site's
 * "Legacy of Eminent Speakers".
 *
 * These are the previous editions' platform, not this one's programme —
 * nobody here is speaking in Vijayawada. The section heading has to keep
 * saying so; a row of portraits under a summit's own app reads as a line-up
 * unless the words stop it.
 *
 * Portraits are mirrored locally and squared off a face-centred crop. Where
 * the site hotlinks a news thumbnail or a stock library, the same portrait is
 * taken from Wikimedia instead — a summit app should not be loading images
 * out of someone else's CDN on every open.
 */
export interface EventLegacySpeaker {
  slug: string;
  name: string;
  role: string;
  image: string;
}

export const EVENT_LEGACY_SPEAKERS: EventLegacySpeaker[] = [
  {
    slug: "modi",
    name: "Sri Narendra Modi",
    role: "Hon'ble Prime Minister, India",
    image: "/legacy/modi.webp",
  },
  {
    slug: "kalam",
    name: "Dr. APJ Abdul Kalam",
    role: "Former President, India",
    image: "/legacy/kalam.webp",
  },
  {
    slug: "manmohan-singh",
    name: "Dr. Manmohan Singh",
    role: "Former Prime Minister, India",
    image: "/legacy/manmohan-singh.webp",
  },
  {
    slug: "ravi-shankar",
    name: "Gurudev Sri Sri Ravi Shankar",
    role: "Founder, The Art of Living",
    image: "/legacy/ravi-shankar.webp",
  },
  {
    slug: "clinton",
    name: "Sri Bill Clinton",
    role: "Former President, USA",
    image: "/legacy/clinton.webp",
  },
  {
    slug: "gates",
    name: "Sri Bill Gates",
    role: "Chairman, Gates Foundation",
    image: "/legacy/gates.webp",
  },
  {
    slug: "narayana-murthy",
    name: "Sri NR Narayana Murthy",
    role: "Founder, Infosys",
    image: "/legacy/narayana-murthy.webp",
  },
  {
    slug: "parrikar",
    name: "Sri Manohar Parrikar",
    role: "Former Chief Minister, Goa",
    image: "/legacy/parrikar.webp",
  },
  {
    slug: "amartya-sen",
    name: "Sri Amartya Sen",
    role: "Nobel laureate, Harvard",
    image: "/legacy/amartya-sen.webp",
  },
  {
    slug: "nilekani",
    name: "Sri Nandan M. Nilekani",
    role: "Co-Founder & Chairman, Infosys",
    image: "/legacy/nilekani.webp",
  },
];

/**
 * Organisations that backed previous editions of the PanIIT Summit, in the
 * order the summit site lists them — governments first, then the rest.
 *
 * Kept apart from EVENT_SPONSORS (this summit's own, which come from the
 * database) on purpose: a past sponsor shown next to a current one is a
 * claim nobody made. Hence the separate section and its own heading.
 *
 * Logos are mirrored from the summit site and each brand's own site, trimmed
 * to a common box height. Several carry a baked-in white panel; that is how
 * the brand publishes them and the page ground is white anyway.
 */
export interface EventPastSponsor {
  slug: string;
  name: string;
  logo: string;
}

export const EVENT_PAST_SPONSORS: EventPastSponsor[] = [
  {
    slug: "government-of-karnataka",
    name: "Government of Karnataka",
    logo: "/past-sponsors/government-of-karnataka.webp",
  },
  {
    slug: "government-of-telangana",
    name: "Government of Telangana",
    logo: "/past-sponsors/government-of-telangana.webp",
  },
  {
    slug: "karnataka-udyog-mitra",
    name: "Karnataka Udyog Mitra",
    logo: "/past-sponsors/karnataka-udyog-mitra.webp",
  },
  { slug: "nmdc", name: "NMDC", logo: "/past-sponsors/nmdc.webp" },
  { slug: "msil", name: "MSIL", logo: "/past-sponsors/msil.webp" },
  {
    slug: "global-it-associates",
    name: "Global IT Associates",
    logo: "/past-sponsors/global-it-associates.webp",
  },
  {
    slug: "janapriya-upscale",
    name: "Janapriya Upscale",
    logo: "/past-sponsors/janapriya-upscale.webp",
  },
  {
    slug: "msn-realty",
    name: "MSN Realty",
    logo: "/past-sponsors/msn-realty.webp",
  },
  {
    slug: "ayana-woods",
    name: "Ayana Woods",
    logo: "/past-sponsors/ayana-woods.webp",
  },
  { slug: "groww", name: "Groww", logo: "/past-sponsors/groww.webp" },
  { slug: "kuku-fm", name: "Kuku FM", logo: "/past-sponsors/kuku-fm.webp" },
  { slug: "sap", name: "SAP", logo: "/past-sponsors/sap.webp" },
  {
    slug: "hdfc-mutual-fund",
    name: "HDFC Mutual Fund",
    logo: "/past-sponsors/hdfc-mutual-fund.webp",
  },
  {
    slug: "cashfree-payments",
    name: "Cashfree Payments",
    logo: "/past-sponsors/cashfree-payments.webp",
  },
  { slug: "harness", name: "Harness", logo: "/past-sponsors/harness.webp" },
  {
    slug: "bharat-ke-super-founders",
    name: "Bharat Ke Super Founders",
    logo: "/past-sponsors/bharat-ke-super-founders.webp",
  },
  { slug: "rupeezy", name: "Rupeezy", logo: "/past-sponsors/rupeezy.webp" },
];

/**
 * The scale of the summit, for the four blocks under the masthead.
 *
 * Everything here is a published number: visitors, campuses and founders
 * come from the press briefings and the state's own posters. The exhibitor
 * count is the exception — it is counted live from the exhibitors table at
 * render time, because that is a real number the moment the expo directory
 * is filled in and a made-up one before. Until a single exhibitor exists,
 * EVENT_SCALE_STANDIN takes that slot so the row still reads as four.
 *
 * `short` exists because four blocks in one row on a phone leaves about
 * 77px each, and "Unicorn founders & startup leaders" does not fit in 77px.
 * The full label is still what a screen reader gets.
 *
 * Marks are the brochure's own red figures, the same set the about page
 * uses for "Who attends" — the globe of pins for the campuses, the crowd
 * with the badge for investors. They are knocked out to white on the navy.
 */
export interface EventScaleStat {
  value: string;
  label: string;
  short: string;
  icon: string;
}

export const EVENT_SCALE: EventScaleStat[] = [
  {
    value: EVENT_VISITOR_COUNT,
    label: "Visitors expected",
    short: "Visitors",
    icon: "/audience/ceos.webp",
  },
  {
    value: String(EVENT_IITS.length),
    label: "IITs represented",
    short: "IITs",
    icon: "/audience/directors.webp",
  },
  {
    value: "100+",
    label: "Unicorn founders & startup leaders",
    short: "Founders",
    icon: "/audience/founders.webp",
  },
];

/** Shown in the exhibitors slot while the expo directory is empty. */
export const EVENT_SCALE_STANDIN: EventScaleStat = {
  value: "50+",
  label: "Investors, VCs & family offices",
  short: "Investors",
  icon: "/audience/investors.webp",
};

/** The mark for the live exhibitor count — the Expo tab's own icon. */
export const EVENT_SCALE_EXHIBITOR_ICON = "/ui/nav-expo.webp";

/**
 * Promotional banners across the top of the agenda.
 *
 * Empty until the artwork exists, and the strip draws numbered placeholders
 * at the exact size to fill instead of collapsing — the point of the slots
 * is that someone can see where the banners go before they have them.
 *
 * Drop files in public/promos, add them here, and the placeholders give way
 * to the real thing. 1200×675 (16:9); `href` is optional and makes a banner
 * a link.
 */
export interface EventPromo {
  src: string;
  alt: string;
  href?: string;
}

export const EVENT_PROMOS: EventPromo[] = [
  {
    src: "/ui/leadership-banner.webp",
    alt: "Prime Minister Narendra Modi and Chief Minister N. Chandrababu Naidu, with the map of Andhra Pradesh",
  },
  {
    src: "/ui/promos/felicitation.webp",
    alt: "A speaker being felicitated on stage at a PanIIT Alumni India summit",
  },
  {
    src: "/ui/promos/cm-report.webp",
    alt: "The PanIIT Andhra Pradesh Summit report being presented to Chief Minister N. Chandrababu Naidu",
  },
  {
    src: "/ui/promos/bangalore-summit.webp",
    alt: "Delegates and volunteers on stage at the PanIIT Bangalore Summit 2026",
  },
];

/** Placeholders drawn while EVENT_PROMOS is empty. */
export const EVENT_PROMO_SLOTS = 3;

/**
 * Artwork for the login prompt — an iPhone showing this app's sign-in
 * screen, cut out on transparency the way the gate pass banner's phone is.
 *
 * Null until the file exists, and the banner lays out without it rather
 * than pointing <Image> at a 404.
 */
export const EVENT_LOGIN_ART: string | null = "/ui/login-desk.webp";

/**
 * Artwork for the two app prompts — the slide-up that offers to install the
 * app, and the one that asks to turn notifications on afterwards.
 *
 * Null until the files land; both the sheet and the home banner lay out
 * without them rather than pointing <Image> at a 404.
 */
export const EVENT_INSTALL_ART: string | null = "/ui/install-app.webp";
export const EVENT_NOTIFY_ART: string | null = "/ui/notify.webp";
