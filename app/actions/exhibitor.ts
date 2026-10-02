"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * What an exhibitor's owner does for their own stall: its details and its
 * team. The database decides who may (0030_exhibitor_access.sql): only the
 * stall's owner edits it or its team, and the stall number, place and
 * visibility stay with the organisers whatever is sent.
 */
export type ExhibitorResult = { ok: true } | { error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function changed(id: string) {
  revalidateTag("exhibitors");
  revalidatePath("/exhibitors");
  revalidatePath(`/exhibitors/${id}`);
}

export interface MyExhibitorInput {
  name: string;
  tagline: string;
  about: string;
  website: string;
  category: string;
  logo_url: string;
}

export async function updateMyExhibitor(id: string, input: MyExhibitorInput): Promise<ExhibitorResult> {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) return { error: "The company needs a name." };
  let website = input.website.trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const { data, error } = await supabase
    .from("exhibitors")
    .update({
      name: name.slice(0, 120),
      tagline: input.tagline.trim().slice(0, 160) || null,
      about: input.about.trim().slice(0, 2000) || null,
      website: website || null,
      category: input.category.trim().slice(0, 60) || null,
      logo_url: input.logo_url.trim() || null,
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only this stall's owner can change it." };
  changed(id);
  return { ok: true };
}

export async function addTeamMember(id: string, rawEmail: string): Promise<ExhibitorResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "That does not look like an email address." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { error } = await supabase
    .from("exhibitor_access")
    .insert({ exhibitor_id: id, email, role: "member", added_by: user.id });
  if (error) {
    return {
      error: error.code === "23505" ? "Already on the team." : "Only this stall's owner can add people.",
    };
  }
  revalidatePath(`/exhibitors/${id}`);
  return { ok: true };
}

export async function removeTeamMember(id: string, email: string): Promise<ExhibitorResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exhibitor_access")
    .delete()
    .eq("exhibitor_id", id)
    .eq("email", email.toLowerCase())
    .eq("role", "member")
    .select("email");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only this stall's owner can remove people." };
  revalidatePath(`/exhibitors/${id}`);
  return { ok: true };
}
