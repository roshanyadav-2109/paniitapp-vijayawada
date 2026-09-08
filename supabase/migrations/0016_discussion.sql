-- 0016_discussion.sql
--
-- A common discussion feed for the summit: attendees post, comment, react, and
-- run polls. Event-scoped like the rest of the content tables (0013), so the
-- two summit editions never see each other's threads.
--
-- Counts (likes, comments, votes) are denormalised onto the parent row and
-- maintained by triggers, matching how session_questions.upvotes already
-- works in this schema. The feed reads them without N+1 aggregates.

begin;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete restrict,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (length(btrim(body)) between 1 and 2000),
  kind          text not null default 'text' check (kind in ('text', 'poll')),
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  vote_count    integer not null default 0,
  is_pinned     boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_posts_event_created
  on public.posts (event_id, is_pinned desc, created_at desc);
create index if not exists idx_posts_author on public.posts (author_id);

-- ---------------------------------------------------------------------------
-- poll options — only for posts with kind = 'poll'
-- ---------------------------------------------------------------------------

create table if not exists public.poll_options (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  label      text not null check (length(btrim(label)) between 1 and 120),
  position   integer not null default 0,
  vote_count integer not null default 0
);

create index if not exists idx_poll_options_post on public.poll_options (post_id, position);

-- ---------------------------------------------------------------------------
-- votes — primary key gives one vote per person per poll, and lets someone
-- change their mind with an update rather than accumulating rows.
-- ---------------------------------------------------------------------------

create table if not exists public.poll_votes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  option_id  uuid not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_poll_votes_option on public.poll_votes (option_id);

-- ---------------------------------------------------------------------------
-- likes and comments
-- ---------------------------------------------------------------------------

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post
  on public.post_comments (post_id, created_at);

-- ---------------------------------------------------------------------------
-- Count maintenance
-- ---------------------------------------------------------------------------

create or replace function public.bump_post_likes()
returns trigger language plpgsql security definer as $fn$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_post_likes on public.post_likes;
create trigger trg_post_likes
  after insert or delete on public.post_likes
  for each row execute function public.bump_post_likes();

create or replace function public.bump_post_comments()
returns trigger language plpgsql security definer as $fn$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_post_comments on public.post_comments;
create trigger trg_post_comments
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_comments();

-- Handles the update case too: changing a vote must move the count between
-- options, not just add to the new one.
create or replace function public.bump_poll_votes()
returns trigger language plpgsql security definer as $fn$
begin
  if tg_op = 'INSERT' then
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
    update public.posts set vote_count = vote_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    update public.posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.option_id is distinct from old.option_id then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
  end if;
  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_poll_votes on public.poll_votes;
create trigger trg_poll_votes
  after insert or update or delete on public.poll_votes
  for each row execute function public.bump_poll_votes();

-- ---------------------------------------------------------------------------
-- RLS
--
-- Reads are open to signed-in attendees, matching the rest of the event
-- content. Writes are restricted to the author, with organizers able to
-- moderate.
-- ---------------------------------------------------------------------------

alter table public.posts         enable row level security;
alter table public.poll_options  enable row level security;
alter table public.poll_votes    enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts for select using (true);

drop policy if exists posts_insert_self on public.posts;
create policy posts_insert_self on public.posts
  for insert with check (author_id = auth.uid());

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update using (author_id = auth.uid() or is_organizer())
  with check (author_id = auth.uid() or is_organizer());

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete using (author_id = auth.uid() or is_organizer());

drop policy if exists poll_options_select_all on public.poll_options;
create policy poll_options_select_all on public.poll_options for select using (true);

-- Options are written with the post, so the check follows the parent's author.
drop policy if exists poll_options_write_owner on public.poll_options;
create policy poll_options_write_owner on public.poll_options
  for all using (
    exists (select 1 from public.posts p
            where p.id = poll_options.post_id
              and (p.author_id = auth.uid() or is_organizer()))
  )
  with check (
    exists (select 1 from public.posts p
            where p.id = poll_options.post_id
              and (p.author_id = auth.uid() or is_organizer()))
  );

drop policy if exists poll_votes_select_all on public.poll_votes;
create policy poll_votes_select_all on public.poll_votes for select using (true);

drop policy if exists poll_votes_own on public.poll_votes;
create policy poll_votes_own on public.poll_votes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists post_likes_select_all on public.post_likes;
create policy post_likes_select_all on public.post_likes for select using (true);

drop policy if exists post_likes_own on public.post_likes;
create policy post_likes_own on public.post_likes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists post_comments_select_all on public.post_comments;
create policy post_comments_select_all on public.post_comments for select using (true);

drop policy if exists post_comments_insert_self on public.post_comments;
create policy post_comments_insert_self on public.post_comments
  for insert with check (user_id = auth.uid());

drop policy if exists post_comments_delete_own on public.post_comments;
create policy post_comments_delete_own on public.post_comments
  for delete using (user_id = auth.uid() or is_organizer());

grant select, insert, update, delete on
  public.posts, public.poll_options, public.poll_votes,
  public.post_likes, public.post_comments
  to authenticated;

commit;
