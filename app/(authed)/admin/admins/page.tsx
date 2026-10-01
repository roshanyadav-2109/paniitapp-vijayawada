import Link from "next/link";
import { organizerClient, Restricted } from "../guard";
import { AdminsClient, type AdminRow } from "./admins-client";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const supabase = await organizerClient();
  if (!supabase) return <Restricted />;

  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("list_admins"),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl pb-10 pt-5 lg:pt-8">
      <Link href="/admin" className="text-[13px] text-brand-800">
        &larr; Admin
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-brand-950">Admins</h1>
      <AdminsClient
        admins={(data as AdminRow[] | null) ?? []}
        me={(auth.user?.email ?? "").toLowerCase()}
      />
    </div>
  );
}
