"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { IIT_CAMPUSES } from "@/lib/constants";

const UrlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Must be a URL starting with http:// or https://",
  });

const Schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  designation: z.string().trim().min(2, "Designation is required").max(120),
  company: z.string().trim().min(2, "Organisation is required").max(120),
  iit_campus: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (IIT_CAMPUSES as readonly string[]).includes(v),
      { message: "Select your IIT campus from the list" }
    ),
  graduation_year: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v), {
      message: "Year must be 4 digits",
    }),
  branch: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
  linkedin_url: UrlOrEmpty,
  twitter_url: UrlOrEmpty,
  next: z.string().trim(),
});

export type OnboardingResult =
  | { ok: true }
  | { error: "unauth" }
  | { error: "invalid"; message: string }
  | { error: "db"; message: string };

export async function completeOnboarding(
  _prev: unknown,
  formData: FormData
): Promise<OnboardingResult> {
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
      "next",
    ].map((k) => [k, (formData.get(k) ?? "").toString()])
  );

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const update = {
    full_name: parsed.data.full_name,
    designation: parsed.data.designation,
    company: parsed.data.company,
    iit_campus: parsed.data.iit_campus || null,
    graduation_year: parsed.data.graduation_year
      ? Number(parsed.data.graduation_year)
      : null,
    branch: parsed.data.branch || null,
    bio: parsed.data.bio || null,
    linkedin_url: parsed.data.linkedin_url || null,
    twitter_url: parsed.data.twitter_url || null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) return { error: "db", message: error.message };

  revalidatePath("/me");
  revalidatePath("/home");
  const safeNext = parsed.data.next.startsWith("/") ? parsed.data.next : "/home";
  redirect(safeNext);
}
