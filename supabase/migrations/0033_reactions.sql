-- Reactions on Discuss posts and their replies.
--
-- One reaction per person per post or reply, from a short professional
-- set: agree, love, applause, praise, insightful. No laughing faces. Picking
-- another reaction replaces yours; picking the same one again removes it.
--
-- The "Agree" a post already had (post_likes, 0016) is carried over as
-- "agree", so no count drops. post_likes itself is left as it was.

begin;

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('agree', 'love', 'applause', 'praise', 'insightful')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('agree', 'love', 'applause', 'praise', 'insightful')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists post_reactions_post_idx on public.post_reactions (post_id);
create index if not exists comment_reactions_comment_idx on public.comment_reactions (comment_id);

alter table public.post_reactions enable row level security;
alter table public.comment_reactions enable row level security;

-- Anyone who can read the feed can see the counts.
drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions for select using (true);
drop policy if exists comment_reactions_select on public.comment_reactions;
create policy comment_reactions_select on public.comment_reactions for select using (true);

-- People add, change and remove only their own.
drop policy if exists post_reactions_own on public.post_reactions;
create policy post_reactions_own on public.post_reactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists comment_reactions_own on public.comment_reactions;
create policy comment_reactions_own on public.comment_reactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.post_reactions, public.comment_reactions to anon, authenticated;
grant insert, update, delete on public.post_reactions, public.comment_reactions to authenticated;

insert into public.post_reactions (post_id, user_id, reaction, created_at)
  select post_id, user_id, 'agree', coalesce(created_at, now()) from public.post_likes
  on conflict (post_id, user_id) do nothing;

commit;
