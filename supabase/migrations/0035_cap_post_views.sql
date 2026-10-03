-- Keep discussion view counts realistic and bounded.
-- A post can still gain one view per distinct viewer/device, but never above
-- the product display ceiling of 3,500.

begin;

update public.posts
set view_count = 3500
where view_count > 3500;

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
  update public.posts p
  set view_count = least(p.view_count + 1, 3500)
  from fresh
  where fresh.post_id = p.id;
end;
$$;

revoke all on function public.record_post_views(uuid[], text) from public;
grant execute on function public.record_post_views(uuid[], text) to anon, authenticated;

commit;
