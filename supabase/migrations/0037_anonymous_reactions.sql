-- Allow discussion reactions before sign-in.
-- Signed-in users use a stable account key; guests use a stable device key.

begin;

alter table public.post_reactions add column if not exists viewer text;
update public.post_reactions
set viewer = 'user:' || user_id::text
where viewer is null;
alter table public.post_reactions alter column viewer set not null;
alter table public.post_reactions alter column user_id drop not null;
alter table public.post_reactions drop constraint if exists post_reactions_pkey;
alter table public.post_reactions add primary key (post_id, viewer);

alter table public.comment_reactions add column if not exists viewer text;
update public.comment_reactions
set viewer = 'user:' || user_id::text
where viewer is null;
alter table public.comment_reactions alter column viewer set not null;
alter table public.comment_reactions alter column user_id drop not null;
alter table public.comment_reactions drop constraint if exists comment_reactions_pkey;
alter table public.comment_reactions add primary key (comment_id, viewer);

create or replace function public.toggle_post_reaction(target_id uuid, reaction_key text, device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_key text := coalesce('user:' || auth.uid()::text, 'device:' || left(device, 48));
begin
  if reaction_key not in ('agree', 'love', 'applause', 'praise', 'insightful') then return; end if;
  if auth.uid() is null and (device is null or char_length(device) < 8) then return; end if;

  if exists (
    select 1 from public.post_reactions
    where post_id = target_id and viewer = viewer_key and reaction = reaction_key
  ) then
    delete from public.post_reactions where post_id = target_id and viewer = viewer_key;
  else
    insert into public.post_reactions (post_id, user_id, viewer, reaction)
    values (target_id, auth.uid(), viewer_key, reaction_key)
    on conflict (post_id, viewer) do update
      set user_id = excluded.user_id, reaction = excluded.reaction;
  end if;
end;
$$;

create or replace function public.toggle_comment_reaction(target_id uuid, reaction_key text, device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_key text := coalesce('user:' || auth.uid()::text, 'device:' || left(device, 48));
begin
  if reaction_key not in ('agree', 'love', 'applause', 'praise', 'insightful') then return; end if;
  if auth.uid() is null and (device is null or char_length(device) < 8) then return; end if;

  if exists (
    select 1 from public.comment_reactions
    where comment_id = target_id and viewer = viewer_key and reaction = reaction_key
  ) then
    delete from public.comment_reactions where comment_id = target_id and viewer = viewer_key;
  else
    insert into public.comment_reactions (comment_id, user_id, viewer, reaction)
    values (target_id, auth.uid(), viewer_key, reaction_key)
    on conflict (comment_id, viewer) do update
      set user_id = excluded.user_id, reaction = excluded.reaction;
  end if;
end;
$$;

drop policy if exists post_reactions_own on public.post_reactions;
drop policy if exists comment_reactions_own on public.comment_reactions;
revoke insert, update, delete on public.post_reactions, public.comment_reactions from anon, authenticated;
grant select on public.post_reactions, public.comment_reactions to anon, authenticated;
grant execute on function public.toggle_post_reaction(uuid, text, text) to anon, authenticated;
grant execute on function public.toggle_comment_reaction(uuid, text, text) to anon, authenticated;

commit;
