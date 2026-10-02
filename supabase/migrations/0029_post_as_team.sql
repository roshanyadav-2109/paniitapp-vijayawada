-- Admins choose, post by post, whether it goes out under the summit team's
-- name and mark or under their own. Only an organiser or admin can set it:
-- from anyone else the flag is quietly dropped.

alter table public.posts add column if not exists as_team boolean not null default false;

create or replace function public.guard_post_as_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.as_team and auth.uid() is not null and not public.is_organizer() then
    new.as_team := false;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard_as_team on public.posts;
create trigger posts_guard_as_team
  before insert or update of as_team on public.posts
  for each row execute function public.guard_post_as_team();
