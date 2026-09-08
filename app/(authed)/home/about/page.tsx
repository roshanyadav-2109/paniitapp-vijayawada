import { ExternalLink } from "lucide-react";
import {
  EVENT_CITY,
  EVENT_DATE_TEXT,
  EVENT_FOCUS_AREAS,
  EVENT_NAME,
  EVENT_TAGLINE,
  EVENT_VIDEO_URL,
} from "@/lib/event-config";

export const dynamic = "force-dynamic";

const SUMMIT_VIDEO_URL = EVENT_VIDEO_URL;

const STAKEHOLDERS = [
  {
    name: "Alumni network",
    body: "Working professionals, builders, and operators across 23 IIT campuses.",
  },
  {
    name: "Founders",
    body: "Early- to growth-stage builders in deep tech, AI, climate, and consumer.",
  },
  {
    name: "Investors",
    body: "Angels, VC partners, family offices, and growth funds with India focus.",
  },
  {
    name: "Policy makers",
    body: "Government, regulators, and industry bodies shaping technology policy.",
  },
  {
    name: "Industry partners",
    body: "Operators from large Indian and global enterprises with deep tech roots.",
  },
  {
    name: "Press",
    body: "Journalists and analysts covering Indian technology and policy.",
  },
];

export default function AboutSummitPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-12 pt-4">
      <section className="overflow-hidden rounded-lg border border-brand-100 bg-white">
        <div className="relative aspect-video w-full bg-brand-950">
          <video
            src={SUMMIT_VIDEO_URL}
            className="absolute inset-0 size-full object-cover"
            controls
            playsInline
            preload="metadata"
            title={`${EVENT_NAME} video`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-brand-100 bg-white p-5">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-950">
          About the summit
        </h1>
        <p className="mt-3 text-sm leading-7 text-brand-900">
          The {EVENT_NAME} brings the technology community together for a
          single day of focused work on {EVENT_TAGLINE} — across{" "}
          {EVENT_FOCUS_AREAS}. Aligned with Swarna Andhra 2047 and Viksit Bharat
          2047, alumni, founders, investors and policy makers from all 23 IIT
          campuses converge in {EVENT_CITY} on {EVENT_DATE_TEXT}.
        </p>
        <a
          href="https://paniit.org"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900"
        >
          paniit.org
          <ExternalLink className="size-3.5" strokeWidth={1.8} />
        </a>
      </section>

      <section className="rounded-lg border border-brand-100 bg-white p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-800/75">
          Who&apos;s participating
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STAKEHOLDERS.map((s) => (
            <li
              key={s.name}
              className="rounded-md border border-brand-100 bg-brand-50/60 p-4"
            >
              <p className="text-[13px] font-semibold text-brand-950">{s.name}</p>
              <p className="mt-1 text-[12px] leading-5 text-brand-900/80">
                {s.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
