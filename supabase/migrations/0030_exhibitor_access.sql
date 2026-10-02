-- Exhibitors run their own stall.
--
-- An admin names an owner email for each exhibitor. Signed in with that
-- email, the owner edits the stall's own details (not its stall number,
-- place or visibility, which stay with the organisers) and adds the emails
-- of their team. Owner and team can post in the discussion as the
-- exhibitor, a post that then shows the company and links to its page.
--
-- Kept apart from exhibitor_team_members, which is the public "who to meet
-- at the stall" list: this one decides access and is private.

create table if not exists public.exhibitor_access (
  exhibitor_id uuid not null references public.exhibitors(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  role text not null check (role in ('owner', 'member')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (exhibitor_id, email)
);
create index if not exists exhibitor_access_email_idx on public.exhibitor_access (email);
alter table public.exhibitor_access enable row level security;

-- The signed-in person's email, as their login says it.
create or replace function public.my_email()
returns text
language sql
stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_exhibitor_member(eid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exhibitor_access
    where exhibitor_id = eid and email = public.my_email() and public.my_email() <> ''
  );
$$;

create or replace function public.is_exhibitor_owner(eid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exhibitor_access
    where exhibitor_id = eid and email = public.my_email() and role = 'owner' and public.my_email() <> ''
  );
$$;

drop policy if exists exhibitor_access_read on public.exhibitor_access;
create policy exhibitor_access_read on public.exhibitor_access
  for select using (public.is_organizer() or public.is_exhibitor_member(exhibitor_id));

drop policy if exists exhibitor_access_add on public.exhibitor_access;
create policy exhibitor_access_add on public.exhibitor_access
  for insert with check (
    public.is_organizer() or (public.is_exhibitor_owner(exhibitor_id) and role = 'member')
  );

drop policy if exists exhibitor_access_remove on public.exhibitor_access;
create policy exhibitor_access_remove on public.exhibitor_access
  for delete using (
    public.is_organizer() or (public.is_exhibitor_owner(exhibitor_id) and role = 'member')
  );

drop policy if exists exhibitor_access_change on public.exhibitor_access;
create policy exhibitor_access_change on public.exhibitor_access
  for update using (public.is_organizer()) with check (public.is_organizer());

-- Owners edit their own stall, and its own people can see it before it is
-- published.
drop policy if exists exhibitors_owner_update on public.exhibitors;
create policy exhibitors_owner_update on public.exhibitors
  for update using (public.is_exhibitor_owner(id)) with check (public.is_exhibitor_owner(id));

drop policy if exists exhibitors_member_read on public.exhibitors;
create policy exhibitors_member_read on public.exhibitors
  for select using (public.is_exhibitor_member(id));

-- What only the organisers decide stays as it was when an owner saves.
create or replace function public.guard_exhibitor_owner_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_organizer() then
    return new;
  end if;
  new.event_id := old.event_id;
  new.booth_number := old.booth_number;
  new.booth_venue_id := old.booth_venue_id;
  new.location_floor := old.location_floor;
  new.display_order := old.display_order;
  new.is_published := old.is_published;
  return new;
end;
$$;

drop trigger if exists exhibitors_guard_owner_edit on public.exhibitors;
create trigger exhibitors_guard_owner_edit
  before update on public.exhibitors
  for each row execute function public.guard_exhibitor_owner_edit();

-- Owners put their logo under their own exhibitor's folder in LOGOS.
create or replace function public.can_upload_exhibitor_logo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exhibitor_access a
    where a.email = public.my_email() and a.role = 'owner'
      and object_name like '%/exhibitors/' || a.exhibitor_id::text || '/%'
  );
$$;

drop policy if exists "LOGOS exhibitor owner insert" on storage.objects;
create policy "LOGOS exhibitor owner insert" on storage.objects
  for insert with check (bucket_id = 'LOGOS' and public.can_upload_exhibitor_logo(name));

-- A post can go out as an exhibitor.
alter table public.posts
  add column if not exists as_exhibitor_id uuid references public.exhibitors(id) on delete set null;

create or replace function public.guard_post_as_exhibitor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.as_exhibitor_id is not null then
    if auth.uid() is not null and not public.is_exhibitor_member(new.as_exhibitor_id) then
      new.as_exhibitor_id := null;
    else
      new.as_team := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard_as_exhibitor on public.posts;
create trigger posts_guard_as_exhibitor
  before insert or update of as_exhibitor_id on public.posts
  for each row execute function public.guard_post_as_exhibitor();
