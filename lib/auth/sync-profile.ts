import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";

interface AllowlistRow {
  email: string;
  full_name: string | null;
  role: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  branch: string | null;
  company: string | null;
  designation: string | null;
  interests: string[] | null;
}

interface ExistingProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  branch: string | null;
  company: string | null;
  designation: string | null;
  interests: string[] | null;
  bio?: string | null;
}

export interface ProfileSyncResult {
  email: string;
  profileIncomplete: boolean;
}

export async function syncProfileForUser(user: User): Promise<ProfileSyncResult> {
  if (!user.email) {
    throw new Error("no_email_from_provider");
  }

  const email = user.email.toLowerCase().trim();
  const admin = createServiceRoleClient();
  const allowRow = await getAllowlistRow(admin, email);

  let profileIncomplete = true;
  try {
    const { data: existing } = await admin
      .from("profiles")
      .select(
        "id, email, full_name, role, iit_campus, graduation_year, branch, company, designation, interests, bio"
      )
      .eq("id", user.id)
      .maybeSingle();

    const existingProfile = (existing as ExistingProfile | null) ?? null;
    const metaName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null;
    const fallbackName = allowRow?.full_name || metaName || email.split("@")[0];
    const fallbackRole = allowRow?.role || "alumni";

    const merged = {
      id: user.id,
      email,
      full_name: existingProfile?.full_name ?? fallbackName,
      role: existingProfile?.role ?? fallbackRole,
      iit_campus: existingProfile?.iit_campus ?? allowRow?.iit_campus ?? null,
      graduation_year:
        existingProfile?.graduation_year ?? allowRow?.graduation_year ?? null,
      branch: existingProfile?.branch ?? allowRow?.branch ?? null,
      company: existingProfile?.company ?? allowRow?.company ?? null,
      designation: existingProfile?.designation ?? allowRow?.designation ?? null,
      interests: existingProfile?.interests ?? allowRow?.interests ?? null,
    };

    const { error } = await admin.from("profiles").upsert(merged, {
      onConflict: "id",
    });
    if (error) throw error;

    const fullName = merged.full_name?.trim();
    const designation = merged.designation?.trim();
    const company = merged.company?.trim();
    profileIncomplete = !fullName || !designation || !company;
  } catch (err) {
    console.warn("[auth] profile sync failed for", email, err);
  }

  // `profiles` is shared across summit editions, so the profile row alone does
  // not put this person in *this* event's directory — the membership row does.
  // Kept out of the try above so a membership failure cannot mask a successful
  // profile sync.
  try {
    const { error } = await admin.from("event_participants").upsert(
      { event_id: EVENT_ID, profile_id: user.id },
      { onConflict: "event_id,profile_id" }
    );
    if (error) throw error;
  } catch (err) {
    console.warn("[auth] event membership upsert failed for", email, err);
  }

  return { email, profileIncomplete };
}

async function getAllowlistRow(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string
): Promise<AllowlistRow | null> {
  try {
    const { data } = await admin
      .from("attendee_allowlist")
      .select(
        "email, full_name, role, iit_campus, graduation_year, branch, company, designation, interests"
      )
      .ilike("email", email)
      .eq("event_id", EVENT_ID)
      .maybeSingle();
    return (data as AllowlistRow | null) ?? null;
  } catch {
    return null;
  }
}
