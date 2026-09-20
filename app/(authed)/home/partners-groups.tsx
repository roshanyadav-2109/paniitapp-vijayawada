"use client";

import Image from "next/image";
import { Building2 } from "@/components/icons";
import { useDriftScroll } from "@/hooks/use-drift-scroll";

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
  // Duplicated so the loop can wrap at half the width with no seam.
  const stream = [...partners, ...partners];
  const ref = useDriftScroll<HTMLDivElement>(28);
  return (
    <div
      ref={ref}
      className="no-scrollbar overflow-x-auto overscroll-x-contain [scroll-behavior:auto]"
    >
      <div className="flex w-max gap-3">
        {stream.map((p, i) => (
          <Tile key={`${p.id}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

function Tile({ p }: { p: PartnerCard }) {
  const body = (
    <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-3 ring-1 ring-rule">
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
