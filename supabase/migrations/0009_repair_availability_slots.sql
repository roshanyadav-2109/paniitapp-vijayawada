-- Repair migration for deployments where 0006 did not create availability_slots.
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'available'
    check (status in ('available','booked','blocked')),
  meeting_id uuid references public.meetings(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.availability_slots
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists slot_start timestamptz,
  add column if not exists slot_end timestamptz,
  add column if not exists status text default 'available',
  add column if not exists meeting_id uuid references public.meetings(id) on delete set null,
  add column if not exists created_at timestamptz default now();

create unique index if not exists availability_slots_user_slot_start_uidx
  on public.availability_slots (user_id, slot_start);

create index if not exists idx_availability_user_start
  on public.availability_slots (user_id, slot_start);

alter table public.availability_slots enable row level security;

grant select, insert, update, delete on public.availability_slots to authenticated;

drop policy if exists "availability_read_all" on public.availability_slots;
create policy "availability_read_all" on public.availability_slots
  for select to authenticated using (true);

drop policy if exists "availability_insert_own" on public.availability_slots;
create policy "availability_insert_own" on public.availability_slots
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "availability_update_own" on public.availability_slots;
create policy "availability_update_own" on public.availability_slots
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "availability_delete_own" on public.availability_slots;
create policy "availability_delete_own" on public.availability_slots
  for delete to authenticated using (user_id = auth.uid());
