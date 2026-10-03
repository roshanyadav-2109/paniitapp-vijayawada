-- How many people have seen a Discuss post.
--
-- A view is counted once per person per post: by account when signed in,
-- otherwise by an id the phone keeps for itself. The app records a view
-- once a post has been on screen for a second. posts.view_count carries the
-- total so the feed reads it with the post, and nobody can read who viewed.

begin;

alter table public.posts add column if not exists view_count integer not null default 0;

create table if not exists public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer text not null check (char_length(viewer) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (post_id, viewer)
);

alter table public.post_views enable row level security;
-- No policies: the table is written only by record_post_views below and
-- read by nobody; the counts live on posts.

create or replace function public.record_post_views(post_ids uuid[], device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who text := coalesce(auth.uid()::text, 'device:' || left(device, 48));
begin
  if array_length(post_ids, 1) is null or array_length(post_ids, 1) > 50 then
    return;
  end if;
  if auth.uid() is null and (device is null or char_length(device) < 8) then
    return;
  end if;
  with fresh as (
    insert into public.post_views (post_id, viewer)
      select p.id, who from public.posts p where p.id = any (post_ids)
      on conflict do nothing
      returning post_id
  )
  update public.posts p set view_count = p.view_count + 1
    from fresh where fresh.post_id = p.id;
end;
$$;

revoke all on function public.record_post_views(uuid[], text) from public;
grant execute on function public.record_post_views(uuid[], text) to anon, authenticated;

commit;
