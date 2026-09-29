import { Shield } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

/** The signed-in organiser's client, or null for anyone else. */
export async function organizerClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data as { role: string | null } | null)?.role;
  return role === "admin" || role === "organizer" ? supabase : null;
}

export function Restricted({ message = "Admins only." }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Shield className="mx-auto h-10 w-10 text-rule-strong" strokeWidth={1.5} />
      <h1 className="mt-4 font-display text-lg font-semibold text-brand-900">Restricted</h1>
      <p className="mt-1 text-sm text-brand-900/60">{message}</p>
    </div>
  );
}
