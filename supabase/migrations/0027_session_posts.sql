-- A discussion on each session's page.
--
-- A session's questions go privately to its moderators (0024). Beside them
-- is an open conversation about the session, which everyone reads and
-- anyone signed in joins: the same posts as the Discuss feed, with photos,
-- videos, polls, likes and comments, tied to the session. The Discuss feed
-- keeps the posts with no session; a session's page shows its own.
--
-- Safe to re-run.

alter table public.posts
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists idx_posts_session
  on public.posts (session_id, created_at desc)
  where session_id is not null;
