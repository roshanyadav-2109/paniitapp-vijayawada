import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyOfferCode } from "./copy-code";

interface SponsorRow {
  id: string;
  name: string;
  tier: "title" | "platinum" | "gold" | "silver" | "partner" | string;
  description: string | null;
  offer_title: string | null;
  offer_description: string | null;
  offer_redeem_code: string | null;
  booth_number: string | null;
  website: string | null;
  logo_url: string | null;
}

const tierLabel: Record<string, string> = {
  title: "Title sponsor",
  platinum: "Platinum sponsor",
  gold: "Gold sponsor",
  silver: "Silver sponsor",
  bronze: "Bronze sponsor",
  partner: "Partner",
};

export const dynamic = "force-dynamic";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let sponsor: SponsorRow | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sponsors")
      .select(
        "id, name, tier, description, offer_title, offer_description, offer_redeem_code, booth_number, website, logo_url"
      )
      .eq("id", id)
      .maybeSingle();
    sponsor = (data as SponsorRow | null) ?? null;
  } catch {
    notFound();
  }
  if (!sponsor) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <header className="space-y-1">
        {sponsor.logo_url ? (
          <div className="mb-4 grid size-24 place-items-center rounded-lg bg-white p-3 ring-1 ring-slate-200">
            <Image
              src={sponsor.logo_url}
              alt={sponsor.name}
              width={96}
              height={96}
              className="size-full object-contain"
            />
          </div>
        ) : null}
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {tierLabel[sponsor.tier] ?? sponsor.tier}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">
          {sponsor.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {sponsor.booth_number ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-800 px-2 py-0.5 text-[11px] font-semibold text-white">
              <MapPin className="h-3 w-3" />
              Booth {sponsor.booth_number}
            </span>
          ) : null}
          {sponsor.website ? (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-800 hover:text-brand-900"
            >
              <ExternalLink className="h-3 w-3" />
              Website
            </a>
          ) : null}
        </div>
      </header>

      {sponsor.description ? (
        <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">
          {sponsor.description}
        </p>
      ) : null}

      {sponsor.offer_title || sponsor.offer_description ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Offer for summit attendees
          </h2>
          {sponsor.offer_title ? (
            <p className="mt-2 text-base font-medium text-brand-900">{sponsor.offer_title}</p>
          ) : null}
          {sponsor.offer_description ? (
            <p className="mt-1 text-sm leading-6 text-slate-700 whitespace-pre-line">
              {sponsor.offer_description}
            </p>
          ) : null}
          {sponsor.offer_redeem_code ? <CopyOfferCode code={sponsor.offer_redeem_code} /> : null}
        </section>
      ) : null}

      {sponsor.booth_number ? (
        <Link
          href="/map"
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <MapPin className="h-4 w-4" />
          Find on map
        </Link>
      ) : null}
    </div>
  );
}
