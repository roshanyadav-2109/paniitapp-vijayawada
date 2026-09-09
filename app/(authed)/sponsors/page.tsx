import Link from "next/link";
import Image from "next/image";
import { Building } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/features/empty-state";
import { EVENT_ID, EVENT_NAME } from "@/lib/event-config";

interface SponsorRow {
  id: string;
  name: string;
  tier: "title" | "platinum" | "gold" | "silver" | "partner" | string;
  description: string | null;
  offer_title: string | null;
  offer_description: string | null;
  booth_number: string | null;
  logo_url: string | null;
}

const tierOrder: Record<string, number> = {
  title: 0,
  platinum: 1,
  gold: 2,
  silver: 3,
  bronze: 4,
  partner: 5,
};

const tierLabel: Record<string, string> = {
  title: "Title sponsor",
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  partner: "Partner",
};

const tierCard: Record<string, string> = {
  title: "border-2 border-brand-800 bg-paper-deep",
  platinum: "border border-rule-strong bg-paper",
  gold: "border border-rule bg-white",
  silver: "border border-rule bg-white",
  bronze: "border border-rule bg-white",
  partner: "border border-rule-faint bg-white",
};

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  let sponsors: SponsorRow[] = [];
  let errored = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sponsors")
      .select("id, name, tier, description, offer_title, offer_description, booth_number, logo_url")
      .eq("event_id", EVENT_ID);
    if (error) errored = true;
    sponsors = (data as SponsorRow[] | null) ?? [];
  } catch {
    errored = true;
  }

  sponsors.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99));
  const byTier = sponsors.reduce<Map<string, SponsorRow[]>>((acc, s) => {
    if (!acc.has(s.tier)) acc.set(s.tier, []);
    acc.get(s.tier)!.push(s);
    return acc;
  }, new Map());

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-900">Sponsors</h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          The partners making the {EVENT_NAME} happen.
        </p>
      </header>

      {errored || sponsors.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No sponsors yet"
          description="Sponsors will appear here once organizers finalize partners."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(byTier.entries()).map(([tier, items]) => (
            <section key={tier}>
              <div className="mb-2 eyebrow text-brand-900/60">
                {tierLabel[tier] ?? tier}
              </div>
              <ul className="space-y-2">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sponsors/${s.id}`}
                      className={`block rounded-lg p-4 transition-colors hover:border-rule-strong ${tierCard[tier] ?? tierCard.partner}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-white p-2 ring-1 ring-slate-200">
                          {s.logo_url ? (
                            <Image
                              src={s.logo_url}
                              alt={s.name}
                              width={56}
                              height={56}
                              className="size-full object-contain"
                            />
                          ) : (
                            <Building className="size-5 text-brand-900/45" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-brand-900">{s.name}</div>
                          {s.description ? (
                            <p className="mt-1 text-xs leading-5 text-brand-900/70 line-clamp-2">{s.description}</p>
                          ) : null}
                          {s.offer_title ? (
                            <p className="mt-2 text-xs font-medium text-brand-900/80">{s.offer_title}</p>
                          ) : null}
                        </div>
                        {s.booth_number ? (
                          <span className="inline-flex shrink-0 items-center rounded-md bg-brand-800 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Booth {s.booth_number}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
