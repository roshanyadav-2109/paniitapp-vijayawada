-- Phase 7+ schema additions:
--   * profiles.social_links jsonb so attendees can list instagram / github /
--     personal site / etc beyond linkedin_url + twitter_url
--   * exhibitors + exhibitor_team_members for the show-floor directory
--   * availability_slots for the My Availability flow on /meetings
--   * partner_types + partners for the home-tab partner marquee
--   * key_participants for the home-tab featured-people carousel
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. profiles.social_links
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists social_links jsonb default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. exhibitors
-- ---------------------------------------------------------------------------
create table if not exists public.exhibitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  about text,
  logo_url text,
  cover_url text,
  website text,
  booth_number text,
  booth_venue_id uuid references public.venues(id) on delete set null,
  location_floor text,
  category text,
  social_links jsonb default '{}'::jsonb,
  display_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_exhibitors_published_order
  on public.exhibitors (is_published, display_order, name);

-- ---------------------------------------------------------------------------
-- 3. exhibitor_team_members
-- ---------------------------------------------------------------------------
create table if not exists public.exhibitor_team_members (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references public.exhibitors(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  designation text,
  photo_url text,
  email text,
  linkedin_url text,
  display_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_exhibitor_team_exhibitor
  on public.exhibitor_team_members (exhibitor_id, display_order);

-- ---------------------------------------------------------------------------
-- 4. availability_slots
-- ---------------------------------------------------------------------------
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'available'
    check (status in ('available','booked','blocked')),
  meeting_id uuid references public.meetings(id) on delete set null,
  created_at timestamptz default now(),
  unique (user_id, slot_start)
);
create index if not exists idx_availability_user_start
  on public.availability_slots (user_id, slot_start);

-- ---------------------------------------------------------------------------
-- 5. partner_types
-- ---------------------------------------------------------------------------
create table if not exists public.partner_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  display_order int default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 6. partners
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_type_id uuid references public.partner_types(id) on delete set null,
  name text not null,
  logo_url text,
  website text,
  display_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_partners_type_order
  on public.partners (partner_type_id, display_order);

-- ---------------------------------------------------------------------------
-- 7. key_participants
-- ---------------------------------------------------------------------------
create table if not exists public.key_participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  designation text,
  company text,
  photo_url text,
  profile_id uuid references public.profiles(id) on delete set null,
  display_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_key_participants_published_order
  on public.key_participants (is_published, display_order);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.exhibitors enable row level security;
alter table public.exhibitor_team_members enable row level security;
alter table public.availability_slots enable row level security;
alter table public.partner_types enable row level security;
alter table public.partners enable row level security;
alter table public.key_participants enable row level security;

-- Catalog tables — published rows are readable by any signed-in attendee.
drop policy if exists "exhibitors_read" on public.exhibitors;
create policy "exhibitors_read" on public.exhibitors
  for select to authenticated using (is_published = true);

drop policy if exists "exhibitor_team_read" on public.exhibitor_team_members;
create policy "exhibitor_team_read" on public.exhibitor_team_members
  for select to authenticated using (true);

drop policy if exists "partner_types_read" on public.partner_types;
create policy "partner_types_read" on public.partner_types
  for select to authenticated using (true);

drop policy if exists "partners_read" on public.partners;
create policy "partners_read" on public.partners
  for select to authenticated using (is_published = true);

drop policy if exists "key_participants_read" on public.key_participants;
create policy "key_participants_read" on public.key_participants
  for select to authenticated using (is_published = true);

-- Availability — readable by everyone so proposers can see the other
-- person's free slots; writable only by the owner.
drop policy if exists "availability_read_all" on public.availability_slots;
create policy "availability_read_all" on public.availability_slots
  for select to authenticated using (true);

drop policy if exists "availability_insert_own" on public.availability_slots;
create policy "availability_insert_own" on public.availability_slots
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "availability_update_own" on public.availability_slots;
create policy "availability_update_own" on public.availability_slots
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "availability_delete_own" on public.availability_slots;
create policy "availability_delete_own" on public.availability_slots
  for delete to authenticated using (user_id = auth.uid());
