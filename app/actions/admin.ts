"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ID } from "@/lib/event-config";

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
  expoChanged();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteExhibitor(id: string): Promise<AdminResult> {
  const ctx = await asOrganizer();
  if (!ctx) return { error: "Only admins can change the expo." };
  const { error } = await ctx.supabase.from("exhibitors").delete().eq("id", id);
  if (error) return { error: error.message };
  expoChanged();
  return { ok: true };
}
