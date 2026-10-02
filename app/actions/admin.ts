"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";
import { sendPushToEvent } from "@/lib/push";

/**
 * What the admin panel changes: the programme, who moderates each session,
 * and the expo stalls.
 *
 * Each action checks the caller is an organiser before it does anything,
 * and the database checks again (is_organizer() in every write policy), so
 * a request from anyone else fails twice. After a change the public copies
 * of the programme and the expo, which are cached for five minutes, are
 * dropped so the change shows at once.
 */

export type AdminResult = { ok: true; id?: string } | { error: string };

async function asOrganizer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data as { role: string | null } | null)?.role;
  return role === "admin" || role === "organizer" ? { supabase, user } : null;
}

const SESSION_TYPES = ["keynote", "panel", "workshop", "networking", "meal", "break", "exhibit"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A day and a time, both as the summit's clocks show them (IST). */
function ist(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

function programmeChanged() {
  revalidateTag("sessions");
  revalidatePath("/agenda");
  revalidatePath("/admin/agenda");
}

function expoChanged() {
  revalidateTag("exhibitors");
  revalidatePath("/exhibitors");
  revalidatePath("/admin/expo");
}

// ---- the programme ----------------------------------------------------------

export interface SessionInput {
  id?: string;
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  venue_id: string;
  session_type: string;
  track: string;
  is_featured: boolean;
}

export async function saveSession(input: SessionInput): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change the programme." };

  const title = input.title.trim();
  if (!title) return { error: "A session needs a title." };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.start) ||
    !/^\d{2}:\d{2}$/.test(input.end)
  )
    return { error: "Give the day, and the start and end times." };
  const start_at = ist(input.date, input.start);
  const end_at = ist(input.date, input.end);
  if (end_at <= start_at) return { error: "A session has to end after it starts." };
  if (!SESSION_TYPES.includes(input.session_type)) return { error: "Pick what kind of session it is." };

  const row = {
    title,
    description: input.description.trim() || null,
    start_at,
    end_at,
    venue_id: input.venue_id || null,
    session_type: input.session_type,
    track: input.track.trim() || null,
    is_featured: !!input.is_featured,
    event_id: EVENT_ID,
  };
  const { data, error } = input.id
    ? await ctx.supabase.from("sessions").update(row).eq("id", input.id).select("id").single()
    : await ctx.supabase.from("sessions").insert(row).select("id").single();
  if (error) return { error: error.message };
  programmeChanged();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteSession(id: string): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change the programme." };
  const { error } = await ctx.supabase.from("sessions").delete().eq("id", id);
  if (error) return { error: error.message };
  programmeChanged();
  return { ok: true };
}

// ---- who moderates what -------------------------------------------------------

export async function addModerator(sessionId: string, rawEmail: string): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can assign moderators." };
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "That does not look like an email address." };
  const { error } = await ctx.supabase
    .from("session_moderators")
    .insert({ session_id: sessionId, email, assigned_by: ctx.user.id });
  if (error) {
    return {
      error: error.code === "23505" ? "Already a moderator of this session." : error.message,
    };
  }
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function removeModerator(sessionId: string, email: string): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can assign moderators." };
  const { error } = await ctx.supabase
    .from("session_moderators")
    .delete()
    .eq("session_id", sessionId)
    .eq("email", email.toLowerCase());
  if (error) return { error: error.message };
  revalidatePath("/admin/agenda");
  return { ok: true };
}

// ---- expo stalls ----------------------------------------------------------------

export interface ExhibitorInput {
  id?: string;
  name: string;
  booth_number: string;
  category: string;
  tagline: string;
  about: string;
  website: string;
  logo_url: string;
  is_published: boolean;
  /** Who runs the stall: signed in with this email they edit it and add
   *  their team. Empty leaves it with the organisers alone. */
  owner_email: string;
}

export async function saveExhibitor(input: ExhibitorInput): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change the expo." };
  const name = input.name.trim();
  if (!name) return { error: "A stall needs the company's name." };
  let website = input.website.trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  const row = {
    name,
    booth_number: input.booth_number.trim() || null,
    category: input.category.trim() || null,
    tagline: input.tagline.trim() || null,
    about: input.about.trim() || null,
    website: website || null,
    logo_url: input.logo_url.trim() || null,
    is_published: !!input.is_published,
    event_id: EVENT_ID,
  };
  const { data, error } = input.id
    ? await ctx.supabase.from("exhibitors").update(row).eq("id", input.id).select("id").single()
    : await ctx.supabase.from("exhibitors").insert(row).select("id").single();
  if (error) return { error: error.message };
  const id = (data as { id: string }).id;

  // One owner per stall: the email given replaces whoever it was before.
  const owner = input.owner_email.trim().toLowerCase();
  if (owner && !EMAIL.test(owner)) return { error: "The owner email does not look right." };
  await ctx.supabase.from("exhibitor_access").delete().eq("exhibitor_id", id).eq("role", "owner");
  if (owner) {
    await ctx.supabase.from("exhibitor_access").delete().eq("exhibitor_id", id).eq("email", owner);
    const { error: oErr } = await ctx.supabase
      .from("exhibitor_access")
      .insert({ exhibitor_id: id, email: owner, role: "owner", added_by: ctx.user.id });
    if (oErr) return { error: oErr.message };
  }
  expoChanged();
  return { ok: true, id };
}

export async function deleteExhibitor(id: string): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change the expo." };
  const { error } = await ctx.supabase.from("exhibitors").delete().eq("id", id);
  if (error) return { error: error.message };
  expoChanged();
  return { ok: true };
}

// ---- announcements ----------------------------------------------------------

/**
 * After an announcement is saved: drop the bell's cached feed so it shows
 * within the CDN's thirty seconds, and push it to every attendee of this
 * summit who has notifications on. Returns how many phones it reached.
 */
export async function announcementsChanged(
  title: string,
  body: string | null
): Promise<{ sent: number }> {
  if (!(await asOrganizer())) return { sent: 0 };
  revalidateTag("announcements");
  const { sent } = await sendPushToEvent(EVENT_ID, {
    title: title.slice(0, 120),
    body: (body ?? "").slice(0, 240) || "New announcement from the summit team",
    url: "/home",
    tag: "announcement",
  });
  return { sent };
}

// ---- admin access -------------------------------------------------------------

/**
 * Give or take admin access by email. The database does the checking
 * (set_admin_access in 0028_admin_access.sql): only an admin may call it,
 * nobody removes themselves, and the last admin stays. Someone who has not
 * signed in yet becomes an admin the moment they first do.
 */
export async function setAdminAccess(
  rawEmail: string,
  makeAdmin: boolean
): Promise<{ ok: true; state: string } | { error: string }> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change admin access." };
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "That does not look like an email address." };
  const { data, error } = await ctx.supabase.rpc("set_admin_access", {
    target_email: email,
    make_admin: makeAdmin,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/admins");
  return { ok: true, state: String(data) };
}
