-- Business enquiries to a stall.
--
-- Anyone looking at a stall's page, signed in or not, can send its team an
-- enquiry: who they are, where they work, and what they want. Only that
-- stall's own people (exhibitor_access, 0030) and the organisers can read
-- them. Nobody edits one once sent.

create table if not exists public.exhibitor_enquiries (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references public.exhibitors (id) on delete cascade,
  -- Who sent it, when they were signed in. Kept if the account goes.
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (char_length(email) <= 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  company text check (company is null or char_length(company) <= 160),
  designation text check (designation is null or char_length(designation) <= 120),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists exhibitor_enquiries_exhibitor_idx
  on public.exhibitor_enquiries (exhibitor_id, created_at desc);

alter table public.exhibitor_enquiries enable row level security;

drop policy if exists exhibitor_enquiries_insert on public.exhibitor_enquiries;
create policy exhibitor_enquiries_insert on public.exhibitor_enquiries
  for insert to anon, authenticated
  -- A signed-in sender is recorded as themselves, never as someone else.
  with check (user_id is null or user_id = auth.uid());

drop policy if exists exhibitor_enquiries_select on public.exhibitor_enquiries;
create policy exhibitor_enquiries_select on public.exhibitor_enquiries
  for select to authenticated
  using (public.is_organizer() or public.is_exhibitor_member(exhibitor_id));

grant insert on public.exhibitor_enquiries to anon, authenticated;
grant select on public.exhibitor_enquiries to authenticated;
