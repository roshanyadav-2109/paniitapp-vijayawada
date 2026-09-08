export const IIT_CAMPUSES = [
  "IIT Bombay",
  "IIT Delhi",
  "IIT Kanpur",
  "IIT Kharagpur",
  "IIT Madras",
  "IIT Roorkee",
  "IIT Guwahati",
  "IIT Hyderabad",
  "IIT Gandhinagar",
  "IIT Ropar",
  "IIT Bhubaneswar",
  "IIT Indore",
  "IIT Mandi",
  "IIT Patna",
  "IIT Jodhpur",
  "IIT BHU (Varanasi)",
  "IIT (ISM) Dhanbad",
  "IIT Tirupati",
  "IIT Palakkad",
  "IIT Bhilai",
  "IIT Goa",
  "IIT Jammu",
  "IIT Dharwad",
  "Other",
] as const;

export const ROLES = [
  { value: "founder", label: "Founder", description: "Building a company" },
  { value: "vc", label: "VC", description: "Investor / fund partner" },
  { value: "alumni", label: "Alumni Pro", description: "Working professional" },
  { value: "speaker", label: "Speaker", description: "On stage at the summit" },
  { value: "government", label: "Government", description: "Policy / public sector" },
  { value: "press", label: "Press", description: "Media / journalist" },
] as const;

export const INTERESTS = [
  "AI & Machine Learning",
  "Deep Tech",
  "SaaS",
  "Fintech",
  "Climate / Energy",
  "Healthcare",
  "Robotics",
  "Semiconductors",
  "Defense Tech",
  "Space",
  "Web3",
  "Cybersecurity",
  "Consumer",
  "Marketplaces",
  "Dev Tools",
  "Public Policy",
  "Education",
  "Manufacturing",
  "Logistics",
  "Agritech",
  "Mobility",
  "Hardware",
] as const;

// What an attendee is "looking for" at the summit — preset list.
export const ASKS = [
  "Hiring",
  "Co-founders",
  "Fundraising",
  "Mentorship",
  "Strategic partnerships",
  "Distribution channels",
  "Customer intros",
  "Investor intros",
  "Engineering talent",
  "Pilot customers",
  "Advisory roles",
  "Industry experts",
  "Policy guidance",
  "Government access",
  "Product feedback",
] as const;

// What an attendee "can offer" — preset list.
export const OFFERS = [
  "Hiring (recruiting)",
  "Investing",
  "Mentorship",
  "Engineering expertise",
  "Product expertise",
  "Sales & GTM",
  "Customer intros",
  "Investor intros",
  "Policy network",
  "Operating experience",
  "Hardware know-how",
  "Open to advisory",
  "Open to angel investments",
  "Media / press",
  "Academia partnerships",
] as const;

// Map of session.track → user-facing INTERESTS that overlap with that track.
// Used for the agenda "Match" badge so attendees can spot relevant sessions.
export const TRACK_TO_INTERESTS: Record<string, readonly string[]> = {
  ai: ["AI & Machine Learning", "Dev Tools"],
  deeptech: ["Deep Tech", "Robotics", "Semiconductors", "Hardware", "Space"],
  policy: ["Public Policy"],
  investor: ["Fundraising"],
  workshop: ["Dev Tools"],
  founders: ["Fundraising"],
  climate: ["Climate / Energy"],
  fintech: ["Fintech"],
  keynote: [],
  general: [],
};

export const TRACK_LABELS: Record<string, string> = {
  ai: "AI",
  deeptech: "Deep Tech",
  policy: "Policy",
  investor: "Investor",
  workshop: "Workshop",
  founders: "Founders",
  climate: "Climate",
  fintech: "Fintech",
  keynote: "Keynote",
  general: "General",
};

export const TRACK_COLOR_BG: Record<string, string> = {
  ai: "bg-track-ai",
  deeptech: "bg-track-deeptech",
  policy: "bg-track-policy",
  investor: "bg-track-investor",
  workshop: "bg-track-workshop",
  founders: "bg-track-founders",
  climate: "bg-track-climate",
  fintech: "bg-track-fintech",
  keynote: "bg-track-keynote",
  general: "bg-track-general",
};

export const SUMMIT_TZ = "Asia/Kolkata";
// Re-exported from the event config so the summit day has one definition.
export { EVENT_DATE_ISO as SUMMIT_DATE_ISO } from "./event-config";
