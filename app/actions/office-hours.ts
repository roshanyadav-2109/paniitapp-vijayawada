"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({ enabled: z.boolean() });

export async function setOfficeHours(enabled: boolean): Promise<{ ok: true } | { error: string }> {
  const parsed = Schema.safeParse({ enabled });
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };
  const { error } = await supabase
    .from("profiles")
    .update({ office_hours_enabled: parsed.data.enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/me");
  revalidatePath("/attendees/office-hours");
  return { ok: true };
}
