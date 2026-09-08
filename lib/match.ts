// Attendee matchmaking.
//
// A one-day summit with 800+ delegates, 100+ founders and 50+ investors is a
// search problem: the directory alone makes people scroll. This ranks who is
// worth meeting, and — just as importantly — says why, so the suggestion is
// checkable rather than a black box.
//
// The core signal is complementarity: what you are looking for (profiles.asks)
// against what they can offer (profiles.offers). Note those two vocabularies
// are NOT the same strings — someone asking for "Fundraising" is served by
// someone offering "Investing", not by someone offering "Fundraising" (which
// isn't even an offer). So intersecting the arrays directly, which is the
// obvious implementation, would match almost nobody. ASK_TO_OFFERS below is
// the actual mapping.

export interface MatchProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  iit_campus: string | null;
  interests: string[] | null;
  asks: string[] | null;
  offers: string[] | null;
  available_for_meetings: boolean | null;
  office_hours_enabled: boolean | null;
}

/** Which offers actually satisfy a given ask. Keys are ASKS, values OFFERS. */
const ASK_TO_OFFERS: Record<string, string[]> = {
  Hiring: ["Hiring (recruiting)", "Engineering expertise", "Operating experience"],
  "Co-founders": ["Engineering expertise", "Product expertise", "Operating experience"],
  Fundraising: ["Investing", "Open to angel investments", "Investor intros"],
  Mentorship: ["Mentorship", "Operating experience"],
  "Strategic partnerships": ["Operating experience", "Customer intros", "Sales & GTM"],
  "Distribution channels": ["Sales & GTM", "Customer intros"],
  "Customer intros": ["Customer intros", "Sales & GTM"],
  "Investor intros": ["Investor intros", "Investing"],
  "Engineering talent": ["Engineering expertise", "Hiring (recruiting)"],
  "Pilot customers": ["Customer intros", "Operating experience"],
  "Advisory roles": ["Open to advisory", "Mentorship"],
  "Industry experts": ["Operating experience", "Product expertise", "Hardware know-how"],
  "Policy guidance": ["Policy network"],
  "Government access": ["Policy network"],
  "Product feedback": ["Product expertise", "Mentorship"],
};

// Weights. Ordered by how strong a reason each is to walk across the room.
const W_THEY_HELP_YOU = 10; // your ask ← their offer
const W_YOU_HELP_THEM = 6; //  their ask ← your offer (mutual, so still worth it)
const W_SHARED_INTEREST = 3;
const W_SAME_CAMPUS = 4;
const W_ROLE_PAIR = 6;
const W_OPEN_TO_MEET = 3;
const W_OFFICE_HOURS = 2;

const MAX_INTEREST_HITS = 3; // don't let a long interest list drown the asks

/** Role pairs where the pairing itself is the point. */
function rolePairBonus(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const pair = [a, b].sort().join("|");
  if (pair === "founder|vc") return W_ROLE_PAIR;
  if (pair === "founder|government") return W_ROLE_PAIR / 2;
  if (pair === "founder|press") return W_ROLE_PAIR / 3;
  return 0;
}

function norm(list: string[] | null | undefined): Set<string> {
  return new Set((list ?? []).filter(Boolean));
}

export interface MatchResult {
  score: number;
  /** Short, human-checkable phrases explaining the score, best first. */
  reasons: string[];
}

export function scoreMatch(viewer: MatchProfile, other: MatchProfile): MatchResult {
  if (viewer.id === other.id) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  const viewerAsks = norm(viewer.asks);
  const viewerOffers = norm(viewer.offers);
  const otherAsks = norm(other.asks);
  const otherOffers = norm(other.offers);

  // What you're looking for, that they can give.
  for (const ask of viewerAsks) {
    const satisfying = ASK_TO_OFFERS[ask] ?? [];
    const hit = satisfying.find((o) => otherOffers.has(o));
    if (hit) {
      score += W_THEY_HELP_YOU;
      reasons.push(`Can help with ${ask.toLowerCase()}`);
    }
  }

  // What they're looking for, that you can give — a meeting needs both sides.
  for (const ask of otherAsks) {
    const satisfying = ASK_TO_OFFERS[ask] ?? [];
    const hit = satisfying.find((o) => viewerOffers.has(o));
    if (hit) {
      score += W_YOU_HELP_THEM;
      reasons.push(`Looking for ${ask.toLowerCase()}`);
    }
  }

  const sharedInterests = [...norm(viewer.interests)].filter((i) =>
    norm(other.interests).has(i)
  );
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length, MAX_INTEREST_HITS) * W_SHARED_INTEREST;
    reasons.push(
      sharedInterests.length === 1
        ? `Both into ${sharedInterests[0]}`
        : `${sharedInterests.length} shared interests`
    );
  }

  if (viewer.iit_campus && viewer.iit_campus === other.iit_campus) {
    score += W_SAME_CAMPUS;
    reasons.push(other.iit_campus!);
  }

  const rp = rolePairBonus(viewer.role, other.role);
  if (rp > 0) {
    score += rp;
    if (other.role === "vc") reasons.push("Investor");
    else if (other.role === "founder") reasons.push("Founder");
  }

  if (other.available_for_meetings) score += W_OPEN_TO_MEET;
  if (other.office_hours_enabled) {
    score += W_OFFICE_HOURS;
    reasons.push("Holding office hours");
  }

  return { score, reasons: reasons.slice(0, 3) };
}

export interface RankedMatch extends MatchResult {
  profile: MatchProfile;
}

/**
 * Ranks candidates for the viewer. Returns only genuine matches — a list
 * padded with zero-score strangers is worse than a short honest one.
 */
export function rankMatches(
  viewer: MatchProfile,
  candidates: MatchProfile[],
  limit = 24
): RankedMatch[] {
  return candidates
    .filter((c) => c.id !== viewer.id)
    .map((c) => ({ profile: c, ...scoreMatch(viewer, c) }))
    .filter((m) => m.score > 0 && m.reasons.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.profile.full_name ?? "").localeCompare(b.profile.full_name ?? "")
    )
    .slice(0, limit);
}

/** True when the viewer has given us enough to match on. */
export function canMatch(viewer: MatchProfile): boolean {
  return (
    norm(viewer.asks).size > 0 ||
    norm(viewer.offers).size > 0 ||
    norm(viewer.interests).size > 0
  );
}
