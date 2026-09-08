"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ASKS, INTERESTS, OFFERS } from "@/lib/constants";

const UrlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Must be a URL starting with http:// or https://",
  });

const ProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  designation: z.string().trim().max(120),
  company: z.string().trim().max(120),
  iit_campus: z.string().trim().max(80),
  graduation_year: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v), { message: "Year must be 4 digits" }),
  branch: z.string().trim().max(120),
  bio: z.string().trim(),
  linkedin_url: UrlOrEmpty,
  twitter_url: UrlOrEmpty,
  asks: z.string().trim().max(2000),
  offers: z.string().trim().max(2000),
  interests: z.string().trim().max(2000),
});

export type UpdateProfileResult =
  | { ok: true }
  | { error: "unauth" }
  | { error: "invalid"; message: string }
  | { error: "db"; message: string };

function splitToArray(input: string): string[] | null {
  const items = input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length ? Array.from(new Set(items)) : null;
}

// Constrain to the preset whitelist so people can only save values from the
// chip picker. Anything else (legacy free-text) gets dropped silently.
function whitelist(raw: string[] | null, allowed: readonly string[]): string[] | null {
  if (!raw) return null;
  const allowSet = new Set(allowed);
  const kept = raw.filter((v) => allowSet.has(v));
  return kept.length ? kept : null;
}

export async function updateProfile(
  _prev: unknown,
  formData: FormData
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauth" };

  const raw = Object.fromEntries(
    [
      "full_name",
      "designation",
      "company",
      "iit_campus",
      "graduation_year",
      "branch",
      "bio",
      "linkedin_url",
      "twitter_url",
      "asks",
      "offers",
      "interests",
    ].map((k) => [k, (formData.get(k) ?? "").toString()])
  );

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const update = {
    full_name: parsed.data.full_name,
    designation: parsed.data.designation || null,
    company: parsed.data.company || null,
    iit_campus: parsed.data.iit_campus || null,
    graduation_year: parsed.data.graduation_year ? Number(parsed.data.graduation_year) : null,
    branch: parsed.data.branch || null,
    bio: parsed.data.bio || null,
    linkedin_url: parsed.data.linkedin_url || null,
    twitter_url: parsed.data.twitter_url || null,
    asks: whitelist(splitToArray(parsed.data.asks), ASKS),
    offers: whitelist(splitToArray(parsed.data.offers), OFFERS),
    interests: whitelist(splitToArray(parsed.data.interests), INTERESTS),
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "db", message: error.message };

  revalidatePath("/me");
  redirect("/me");
}
