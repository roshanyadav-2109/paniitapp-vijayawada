-- A stall's page in full: what it shows at the expo and where the company
-- is based, beside its social pages (social_links, already here).
--
-- And the pavilion a stall sits in is the organisers' to set, like its
-- number and its place on the floor: an owner editing their details keeps
-- the category they were given.

alter table public.exhibitors
  add column if not exists showcase text,
  add column if not exists based_in text;

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
  new.category := old.category;
  return new;
end;
$$;
