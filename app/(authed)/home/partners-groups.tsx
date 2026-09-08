"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";

interface PartnerCard {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
}

export function PartnersGroups({
  groups,
}: {
  groups: { id: string; name: string; partners: PartnerCard[] }[];
}) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.id}>
          <h3 className="mb-2 text-[12px] font-semibold tracking-tight text-brand-900">
            {g.name}
          </h3>
          <PartnerRow partners={g.partners} />
        </div>
      ))}
    </div>
  );
}

function PartnerRow({ partners }: { partners: PartnerCard[] }) {
  // Duplicate so the marquee can loop seamlessly via -50% translate.
  const stream = [...partners, ...partners];
  return (
    <div className="overflow-hidden">
      <div className="flex w-max animate-marquee-rtl gap-3">
        {stream.map((p, i) => (
          <Tile key={`${p.id}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

function Tile({ p }: { p: PartnerCard }) {
  const body = (
    <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-3 ring-1 ring-brand-100">
      {p.logo_url ? (
        <Image
          src={p.logo_url}
          alt={p.name}
          width={96}
          height={96}
          className="size-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <Building2 className="size-5 text-brand-800/65" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-brand-900/85">
            {p.name}
          </span>
        </div>
      )}
    </div>
  );
  return p.website ? (
    <a
      href={p.website}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={p.name}
      className="transition-opacity hover:opacity-80"
    >
      {body}
    </a>
  ) : (
    body
  );
}
