"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export type SignInResult =
  | { error: "invalid_email"; message: string }
  | { error: "not_registered" }
  | { error: "session_failed"; message: string }
  | { error: "config" };

export async function signIn(_prev: unknown, formData: FormData): Promise<SignInResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return { error: "config" };
  }

  const raw = formData.get("email");
  const parsed = EmailSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return { error: "invalid_email", message: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const email = parsed.data;

  const admin = createServiceRoleClient();

  // Allow-list check — same source of truth as the OAuth callback.
  const { data: allowed } = await admin
    .from("attendee_allowlist")
    .select("email")
    .ilike("email", email)
    .maybeSingle();
  if (!allowed) return { error: "not_registered" };

  // Generate OTP without sending an email; verify it server-side to set cookies.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link?.properties?.email_otp) {
    return { error: "session_failed", message: linkErr?.message ?? "Could not start session." };
  }

  const ssr = await createClient();
  const { data: verified, error: verifyErr } = await ssr.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: "email",
  });
  if (verifyErr || !verified.session || !verified.user) {
    return { error: "session_failed", message: verifyErr?.message ?? "Could not start session." };
  }

  // Upsert profile so signed-in user has a row before they land on /home.
  // Mirror the OAuth callback merge semantics.
  const { data: allowRow } = await admin
    .from("attendee_allowlist")
    .select(
      "email, full_name, role, iit_campus, graduation_year, branch, company, designation, interests"
    )
    .ilike("email", email)
    .maybeSingle();
  const { data: existing } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, role, iit_campus, graduation_year, branch, company, designation, interests"
    )
    .eq("id", verified.user.id)
    .maybeSingle();

  const fallbackName = allowRow?.full_name || email.split("@")[0];
  const fallbackRole = allowRow?.role || "alumni";

  await admin.from("profiles").upsert(
    {
      id: verified.user.id,
      email,
      full_name: existing?.full_name ?? fallbackName,
      role: existing?.role ?? fallbackRole,
      iit_campus: existing?.iit_campus ?? allowRow?.iit_campus ?? null,
      graduation_year: existing?.graduation_year ?? allowRow?.graduation_year ?? null,
      branch: existing?.branch ?? allowRow?.branch ?? null,
      company: existing?.company ?? allowRow?.company ?? null,
      designation: existing?.designation ?? allowRow?.designation ?? null,
      interests: existing?.interests ?? allowRow?.interests ?? null,
    },
    { onConflict: "id" }
  );

  redirect("/home");
}
