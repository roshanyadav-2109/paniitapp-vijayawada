import Image from "next/image";
import { ExternalLink, Mail, Phone } from "@/components/icons";
import {
  EVENT_AUDIENCE,
  EVENT_CITY,
  EVENT_CONTACTS,
  EVENT_DATE_TEXT,
  EVENT_FOCUS_AREAS,
  EVENT_NAME,
  EVENT_NUMBERS,
  EVENT_SECTORS,
  EVENT_SUBTAGLINE,
  EVENT_TAGLINE,
  EVENT_VIDEO_URL,
  EVENT_VISION,
} from "@/lib/event-config";

export const dynamic = "force-dynamic";

const SUMMIT_VIDEO_URL = EVENT_VIDEO_URL;

/** Editorial section head, matching the home screen's rhythm. */
function Head({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="section-head flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[19px] font-semibold leading-none text-brand-950">
        {title}
      </h2>
      {meta ? (
        <span className="eyebrow shrink-0 text-brand-900/50">{meta}</span>
      ) : null}
    </div>
  );
}

export default function AboutSummitPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 pb-12 pt-4">
      <section className="overflow-hidden rounded-lg bg-brand-950">
        <div className="relative aspect-video w-full">
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

      <section>
        <h1 className="font-display text-[26px] font-semibold leading-tight text-brand-950">
          {EVENT_TAGLINE}
        </h1>
        <p className="eyebrow mt-1.5 text-brand-800/75">{EVENT_SUBTAGLINE}</p>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.75] text-brand-900/85">
          The {EVENT_NAME} brings the technology community together for a single
          day of focused work across {EVENT_FOCUS_AREAS}. Aligned with Swarna
          Andhra 2047 and Viksit Bharat 2047, alumni, founders, investors and
          policy makers from all 23 IIT campuses converge in {EVENT_CITY} on{" "}
          {EVENT_DATE_TEXT}.
        </p>
        <a
          href="https://paniit.org"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-4 inline-flex items-center gap-1.5 border-b border-brand-800/30 pb-0.5 text-[13px] font-medium text-brand-800 transition-colors hover:border-brand-800"
        >
          paniit.org
          <ExternalLink className="size-3.5" strokeWidth={1.8} />
        </a>
      </section>

      {/* Event in numbers — set large in the display face, on rules rather
          than in four boxes, so the figures carry the section themselves. */}
      <section>
        <Head title="The summit in numbers" />
        <dl className="mt-1 grid grid-cols-2 gap-x-6">
          {EVENT_NUMBERS.map((n) => (
            <div
              key={n.label}
              className="border-b border-rule-faint py-3.5 last:border-b-0"
            >
              <dt className="sr-only">{n.label}</dt>
              <dd>
                <span className="block font-display text-[30px] font-semibold leading-none tabular-nums text-brand-800">
                  {n.value}
                </span>
                <span className="mt-1.5 block text-[12.5px] leading-snug text-brand-900/60">
                  {n.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <Head title="Vision" meta={`${EVENT_VISION.length} commitments`} />
        <ol className="list-ruled mt-1">
          {EVENT_VISION.map((v, i) => (
            <li key={v} className="flex gap-4 py-3.5">
              <span
                aria-hidden
                className="w-6 shrink-0 pt-[3px] font-display text-[13px] font-semibold tabular-nums text-brand-800/50"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[14px] leading-[1.7] text-brand-900/85">
                {v}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* The eight sectors in full — the home grid shows the tiles, this is
          where each one gets its line of explanation. */}
      <section>
        <Head title="Session themes" meta={`${EVENT_SECTORS.length} sectors`} />
        <ul className="list-ruled mt-1">
          {EVENT_SECTORS.map((sector) => (
            <li key={sector.slug} className="flex items-start gap-3.5 py-3.5">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-sm ring-1 ring-brand-950/10">
                <Image
                  src={sector.image}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-display text-[15px] font-semibold leading-snug text-brand-950">
                    {sector.label}
                  </span>
                  <span className="eyebrow shrink-0 text-brand-900/50">
                    {sector.slot}
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-6 text-brand-900/65">
                  {sector.blurb}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Head title="Who attends" />
        <ul className="list-ruled mt-1">
          {EVENT_AUDIENCE.map((a) => (
            <li key={a.name} className="py-3.5">
              <p className="font-display text-[15px] font-semibold text-brand-950">
                {a.name}
              </p>
              <p className="mt-0.5 text-[13px] leading-6 text-brand-900/65">
                {a.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Head title="Contact the secretariat" />
        <ul className="list-ruled mt-1">
          {EVENT_CONTACTS.map((c) => (
            <li
              key={c.phone}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5"
            >
              <span className="min-w-0">
                <span className="block font-display text-[15px] font-semibold text-brand-950">
                  {c.name}
                </span>
                {c.role ? (
                  <span className="eyebrow mt-0.5 block text-brand-900/50">
                    {c.role}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-brand-800 transition-colors hover:text-brand-900"
                >
                  <Phone className="size-3.5" strokeWidth={1.7} />
                  {c.phone}
                </a>
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-brand-800 transition-colors hover:text-brand-900"
                  >
                    <Mail className="size-3.5" strokeWidth={1.7} />
                    {c.email}
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
