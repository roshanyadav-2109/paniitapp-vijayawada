-- Phase 7: allow-list + lazy profile creation on OAuth.
-- The attendee_allowlist table is the source of truth for "who's allowed to
-- sign in". On first OAuth (or email-OTP) login, the auth.users row's email
-- is checked against this table. If allowed, a profile row is upserted with
-- id = auth.uid() and any registration fields copied from the allow-list.
--
-- Safe to re-run.

-- Make sure profiles can carry an email.
alter table public.profiles add column if not exists email text;

-- Unique (case-insensitive) so a single email can't be linked to two profiles.
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- The allow-list. Populate this from your registration CSV.
create table if not exists public.attendee_allowlist (
  email          text primary key,
  full_name      text,
  role           text,
  iit_campus     text,
  graduation_year int,
  branch         text,
  company        text,
  designation    text,
  interests      text[],
  added_at       timestamptz default now()
);

-- Lower(email) lookup index
create index if not exists attendee_allowlist_lower_email
  on public.attendee_allowlist (lower(email));

alter table public.attendee_allowlist enable row level security;

-- Organizers/admins can read and manage the allow-list. Regular attendees
-- never need to query it directly — the OAuth callback uses the service role.
drop policy if exists "allowlist_select_org" on public.attendee_allowlist;
create policy "allowlist_select_org" on public.attendee_allowlist
  for select to authenticated using (
    exists (select 1 from public.profiles
            where id = auth.uid() and role in ('organizer','admin'))
  );

drop policy if exists "allowlist_modify_org" on public.attendee_allowlist;
create policy "allowlist_modify_org" on public.attendee_allowlist
  for all to authenticated using (
    exists (select 1 from public.profiles
            where id = auth.uid() and role in ('organizer','admin'))
  ) with check (
    exists (select 1 from public.profiles
            where id = auth.uid() and role in ('organizer','admin'))
  );

-- Example bulk-load shape — adapt to your CSV columns.
-- \copy public.attendee_allowlist (email, full_name, role, iit_campus, graduation_year, branch, company, designation)
--   from 'attendees.csv' csv header;
