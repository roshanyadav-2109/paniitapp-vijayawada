-- Allow each session to carry a curated `interests` tag set so the agenda
-- can be filtered and recommended against the attendee's saved interests.
--
-- The existing `track` column stays (it drives the colour-coded pill); the
-- new `interests` column is the multi-tag dimension used for matchmaking.
-- Safe to re-run.

alter table public.sessions
  add column if not exists interests text[];

create index if not exists idx_sessions_interests_gin
  on public.sessions using gin (interests);
