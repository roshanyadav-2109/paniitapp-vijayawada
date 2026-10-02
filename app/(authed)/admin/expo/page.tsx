import Link from "next/link";
import { EVENT_ID } from "@/lib/event-config";
import { organizerClient, Restricted } from "../guard";
import { ExpoAdmin, type AdminStall } from "./expo-admin";

export const dynamic = "force-dynamic";

export default async function AdminExpoPage() {
  const supabase = await organizerClient();
  if (!supabase) return <Restricted />;

  // Every stall, published or not: the organiser policy reads them all.
  const { data } = await supabase
    .from("exhibitors")
    .select("id, name, booth_number, category, tagline, about, website, logo_url, is_published")
    .eq("event_id", EVENT_ID)
    .order("booth_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  // Each stall's owner, who runs it from its own page.
  const { data: owners } = await supabase
    .from("exhibitor_access")
    .select("exhibitor_id, email")
    .eq("role", "owner");
  const ownerOf = new Map(
    ((owners as { exhibitor_id: string; email: string }[] | null) ?? []).map((o) => [o.exhibitor_id, o.email])
  );
  const stalls = ((data as AdminStall[] | null) ?? []).map((s) => ({ ...s, owner_email: ownerOf.get(s.id) ?? null }));

  return (
    <div className="mx-auto w-full max-w-3xl pb-10 pt-5 lg:pt-8">
      <Link href="/admin" className="text-[13px] text-brand-800">
        &larr; Admin
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-brand-950">Expo stalls</h1>
      <ExpoAdmin stalls={stalls} />
    </div>
  );
}
