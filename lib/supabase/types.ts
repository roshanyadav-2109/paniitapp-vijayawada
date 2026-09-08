// Generated from the live Supabase OpenAPI spec on 2026-05-17.
// To refresh after schema changes, run:
//   supabase gen types typescript --project-id fncnndrexzmqqengbkvi --schema public > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Profile {
  id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  photo_url: string | null;
  role: string;
  company: string | null;
  designation: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  branch: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  city: string | null;
  country: string | null;
  interests: string[] | null;
  asks: string[] | null;
  offers: string[] | null;
  available_for_meetings: boolean | null;
  visibility: string | null;
  office_hours_enabled: boolean | null;
  points: number | null;
  badges: string[] | null;
  qr_token: string | null;
  push_subscription: Json | null;
  onboarded: boolean | null;
  email: string | null; // added by 0005_oauth_allowlist.sql
  social_links: Json | null; // added by 0006
  created_at: string;
  updated_at: string;
}

// The tables below come from migrations/0006_exhibitors_availability_partners.sql.
export interface Exhibitor {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  booth_number: string | null;
  booth_venue_id: string | null;
  location_floor: string | null;
  category: string | null;
  social_links: Json | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string;
}

export interface ExhibitorTeamMember {
  id: string;
  exhibitor_id: string;
  profile_id: string | null;
  full_name: string;
  designation: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  display_order: number | null;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  slot_start: string;
  slot_end: string;
  status: "available" | "booked" | "blocked";
  meeting_id: string | null;
  created_at: string;
}

export interface PartnerType {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  created_at: string;
}

export interface Partner {
  id: string;
  partner_type_id: string | null;
  name: string;
  logo_url: string | null;
  website: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string;
}

// Direct messages between attendees. conversations + messages tables are
// owner-managed by Supabase migrations; messages references a conversation
// row whose participant_a / participant_b are the two attendees.
export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface KeyParticipant {
  id: string;
  full_name: string;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
  profile_id: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  description: string | null;
  track: string | null;
  start_at: string;
  end_at: string;
  venue_id: string | null;
  session_type: string | null;
  capacity: number | null;
  current_checkins: number | null;
  is_featured: boolean | null;
  livestream_url: string | null;
  created_at: string;
}

export interface Venue {
  id: string;
  name: string;
  floor: string | null;
  capacity: number | null;
  description: string | null;
  map_x: number | null;
  map_y: number | null;
  map_floor: number | null;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: "title" | "platinum" | "gold" | "silver" | "bronze" | "partner" | string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  booth_venue_id: string | null;
  booth_number: string | null;
  booth_qr_token: string | null;
  contact_email: string | null;
  offer_title: string | null;
  offer_description: string | null;
  offer_redeem_code: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  requester_id: string;
  invitee_id: string;
  proposed_slots: Json;
  accepted_slot: Json | null;
  status: string;
  message: string | null;
  location: string | null;
  invitee_message: string | null;
  proposed_outside_availability: boolean | null; // added by 0011
  created_at: string;
  updated_at: string;
}

export interface SessionQuestion {
  id: string;
  session_id: string | null;
  user_id: string | null;
  question: string;
  upvotes: number | null;
  is_answered: boolean | null;
  created_at: string;
  // The columns below come from migrations/0003_qa_replies.sql. They may be
  // absent if 0003 hasn't been applied yet.
  is_anonymous?: boolean | null;
  is_pinned?: boolean | null;
  answered_by?: string | null;
  answered_at?: string | null;
  status?: "open" | "answered" | "dismissed" | "duplicate" | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
