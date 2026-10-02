import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";

export interface MyExhibitor {
  id: string;
  name: string;
  logo_url: string | null;
  role: "owner" | "member";
}

/** The stalls the signed-in person runs or works on, read once a request. */
export const getMyExhibitors = cache(async (): Promise<MyExhibitor[]> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    if (!email) return [];
    const { data } = await supabase
      .from("exhibitor_access")
      .select("role, exhibitors!inner(id, name, logo_url, event_id)")
      .eq("email", email)
      .eq("exhibitors.event_id", EVENT_ID);
    return ((data ?? []) as unknown as {
      role: "owner" | "member";
      exhibitors: { id: string; name: string; logo_url: string | null } | { id: string; name: string; logo_url: string | null }[];
    }[]).map((r) => {
      const e = Array.isArray(r.exhibitors) ? r.exhibitors[0] : r.exhibitors;
      return { id: e.id, name: e.name, logo_url: e.logo_url, role: r.role };
    });
  } catch {
    return [];
  }
});
