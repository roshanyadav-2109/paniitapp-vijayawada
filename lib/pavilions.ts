/**
 * The expo's pavilions, as the stall list groups them: each with its own
 * colour and pattern, so a stall says which pavilion it belongs to before a
 * word of it is read.
 */

export type Pattern = "lines" | "orbits" | "grid" | "dots";

export interface Pavilion {
  /** As stored in exhibitors.category. */
  key: string;
  short: string;
  blurb: string;
  from: string;
  to: string;
  pattern: Pattern;
  /** The pavilion's illustration, square, in public/pavilions/. */
  art: string;
}

export const PAVILIONS: readonly Pavilion[] = [
  {
    key: "PanIIT Start-ups",
    art: "/pavilions/paniit-startups-icon.webp",
    short: "Start-ups",
    blurb: "Deep-tech companies built by IIT alumni",
    from: "#1B1464",
    to: "#4338CA",
    pattern: "lines",
  },
  {
    key: "Quantum Valley",
    art: "/pavilions/quantum-valley-icon.webp",
    short: "Quantum Valley",
    blurb: "Quantum computing, sensing and communication for Amaravati",
    from: "#2E1065",
    to: "#0E7490",
    pattern: "orbits",
  },
  {
    key: "DST Innovation Hubs",
    art: "/pavilions/dst-innovation-hubs-icon.webp",
    short: "DST Hubs",
    blurb: "Start-ups from the Technology Innovation Hubs at the IITs",
    from: "#064E3B",
    to: "#0F766E",
    pattern: "grid",
  },
  {
    key: "Institutions & Government",
    art: "/pavilions/institutions-icon.webp",
    short: "Institutions",
    blurb: "IIT Madras, IIT Tirupati, RTIH and the capital region",
    from: "#0F172A",
    to: "#475569",
    pattern: "grid",
  },
  {
    key: "Universities",
    art: "/pavilions/universities-icon.webp",
    short: "Universities",
    blurb: "Andhra Pradesh's universities and their research",
    from: "#7C2D12",
    to: "#B45309",
    pattern: "dots",
  },
  {
    key: "Young Innovators",
    art: "/pavilions/young-innovators-icon.webp",
    short: "Young Innovators",
    blurb: "School students' ideas from the Social Innovation Ideathon",
    from: "#9F1239",
    to: "#EA580C",
    pattern: "dots",
  },
];

const OTHER: Pavilion = {
  key: "Exhibitors",
  short: "Exhibitors",
  blurb: "",
  from: "#1B1464",
  to: "#334155",
  pattern: "lines",
  art: "/pavilions/paniit-startups-icon.webp",
};

export function pavilionOf(category: string | null): Pavilion {
  return PAVILIONS.find((p) => p.key === category) ?? OTHER;
}

/** White line-work over the pavilion's colour, as a CSS background image. */
export function patternImage(p: Pattern): string {
  const svg = {
    lines:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path d="M-2 16 16 -2M-2 30 30 -2" stroke="white" stroke-opacity=".13" stroke-width="1.2"/></svg>',
    orbits:
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><g fill="none" stroke="white" stroke-opacity=".14"><ellipse cx="32" cy="32" rx="28" ry="10"/><ellipse cx="32" cy="32" rx="28" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="28" ry="10" transform="rotate(120 32 32)"/></g><circle cx="32" cy="32" r="2.2" fill="white" fill-opacity=".22"/></svg>',
    grid: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M16 0H0V16" fill="none" stroke="white" stroke-opacity=".12"/></svg>',
    dots: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="2" cy="2" r="1.1" fill="white" fill-opacity=".2"/></svg>',
  }[p];
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The pavilion's band: its pattern laid over its colour. */
export function pavilionBackground(p: Pavilion): string {
  return `${patternImage(p.pattern)}, linear-gradient(135deg, ${p.from}, ${p.to})`;
}
