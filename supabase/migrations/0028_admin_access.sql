-- Admin access, given and taken by admins.
--
-- 1. Nobody promotes themselves. profiles_update_own let any signed-in
--    person update every column of their own row, role included, so one
--    request with their own token made them an admin. Staff roles (admin,
--    organizer, volunteer) can now only be given or taken by an organiser
--    or admin. Ordinary roles (founder, vc, press...) stay the person's own
--    to choose. Requests with no signed-in user (the service role, the SQL
--    editor, the sign-up trigger) are not end users and pass.
--
-- 2. An admin grants or removes admin access by email, with
--    set_admin_access(). For someone who has not signed in yet the grant
--    waits in attendee_allowlist and is applied by handle_new_user the
--    moment their account is created.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  staff constant text[] := array['admin', 'organizer', 'volunteer'];
  before_role text := case when tg_op = 'UPDATE' then old.role else null end;
begin
  if new.role is not distinct from before_role then
    return new;
  end if;
  if not (new.role = any (staff) or coalesce(before_role = any (staff), false)) then
    return new;
  end if;
  if auth.uid() is null or public.is_organizer() then
    return new;
  end if;
  raise exception 'Only an admin can change who is an admin'
    using errcode = '42501';
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update of role on public.profiles
  for each row execute function public.protect_profile_role();

-- New accounts pick up an admin grant made before they signed in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  granted text;
begin
  select a.role into granted
  from public.attendee_allowlist a
  where lower(a.email) = lower(new.email)
    and a.role in ('admin', 'organizer')
  limit 1;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New Attendee'),
    coalesce(granted, 'attendee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.set_admin_access(target_email text, make_admin boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e text := lower(btrim(target_email));
  me text;
  target_id uuid;
  admins_left int;
begin
  if not public.is_organizer() then
    raise exception 'Only an admin can change admin access' using errcode = '42501';
  end if;
  if e is null or e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'That is not an email address' using errcode = '22023';
  end if;

  select id into target_id from auth.users where lower(email) = e limit 1;

  if make_admin then
    if target_id is not null then
      update public.profiles set role = 'admin' where id = target_id;
      return 'granted';
    end if;
    insert into public.attendee_allowlist (event_id, email, role)
    values ('a9d40000-0000-4000-8000-000000000002', e, 'admin')
    on conflict (event_id, email) do update set role = 'admin';
    return 'pending';
  end if;

  select lower(email) into me from auth.users where id = auth.uid();
  if e = me then
    raise exception 'You cannot remove your own admin access' using errcode = '42501';
  end if;

  if target_id is not null then
    select count(*) into admins_left
    from public.profiles
    where role in ('admin', 'organizer') and id <> target_id;
    if admins_left = 0 then
      raise exception 'There must always be at least one admin' using errcode = '42501';
    end if;
    update public.profiles set role = 'attendee'
    where id = target_id and role in ('admin', 'organizer');
  end if;
  delete from public.attendee_allowlist
  where lower(email) = e and role in ('admin', 'organizer') and full_name is null;
  update public.attendee_allowlist set role = 'attendee'
  where lower(email) = e and role in ('admin', 'organizer');
  return 'removed';
end;
$$;

revoke all on function public.set_admin_access(text, boolean) from public, anon;
grant execute on function public.set_admin_access(text, boolean) to authenticated;

-- Who has admin access, signed in or waiting to.
create or replace function public.list_admins()
returns table (email text, full_name text, signed_in boolean)
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email), p.full_name, true
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_organizer() and p.role in ('admin', 'organizer')
  union
  select lower(a.email), null, false
  from public.attendee_allowlist a
  where public.is_organizer()
    and a.role in ('admin', 'organizer')
    and not exists (select 1 from auth.users u where lower(u.email) = lower(a.email))
  order by 3 desc, 1;
$$;

revoke all on function public.list_admins() from public, anon;
grant execute on function public.list_admins() to authenticated;
