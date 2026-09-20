-- A record of what has already been announced.
--
-- The session reminder runs on a schedule, so without this a cron that fires
-- every five minutes tells you about the same session every five minutes.
-- One row per person per thing; the unique key is what makes a second send
-- impossible rather than merely unlikely.

create table if not exists public.push_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- What kind of announcement: 'session_soon' today, room for more.
  kind text not null,
  -- What it was about: a session id, a meeting id.
  ref_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

create index if not exists push_log_sent_at_idx on public.push_log (sent_at desc);

alter table public.push_log enable row level security;

-- Written only by the service role, which bypasses RLS; nobody reads it from
-- the app, so no policy is granted to anon or authenticated.
revoke all on public.push_log from anon, authenticated;
