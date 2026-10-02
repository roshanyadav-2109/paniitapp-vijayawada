-- Session moderators, and questions only they see.
--
-- A session's questions used to be a public thread: anyone signed in read
-- all of them. They are now sent to the session's moderators, who choose
-- what to put to the panel, and nobody else reads them but the person who
-- asked and the organisers.
--
-- Moderators are assigned by email, by an organiser, per session: one
-- person can moderate several sessions, a session can have several
-- moderators, and the assignment can be made before the person has ever
-- signed in. It is matched against the email on their verified token, so
-- it counts from their first sign-in with nothing to backfill.
--
-- Safe to re-run.

create table if not exists public.session_moderators (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  email       text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (session_id, email)
);

create index if not exists idx_session_moderators_email
  on public.session_moderators (email);

-- Is whoever is asking a moderator of this session?
create or replace function public.is_session_moderator(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.session_moderators m
    where m.session_id = sid
      and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$fn$;

alter table public.session_moderators enable row level security;

drop policy if exists session_moderators_organizer_all on public.session_moderators;
create policy session_moderators_organizer_all on public.session_moderators
  for all to authenticated
  using (is_organizer()) with check (is_organizer());

-- A moderator can see which sessions are theirs.
drop policy if exists session_moderators_read_own on public.session_moderators;
create policy session_moderators_read_own on public.session_moderators
  for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------------
-- Questions: the asker, the session's moderators and organisers only.
-- ---------------------------------------------------------------------------

drop policy if exists questions_select_all on public.session_questions;
drop policy if exists questions_select_private on public.session_questions;
create policy questions_select_private on public.session_questions
  for select to authenticated
  using (user_id = auth.uid() or is_organizer() or is_session_moderator(session_id));

drop policy if exists questions_update_organizer on public.session_questions;
drop policy if exists questions_update_moderator on public.session_questions;
create policy questions_update_moderator on public.session_questions
  for update to authenticated
  using (is_organizer() or is_session_moderator(session_id))
  with check (is_organizer() or is_session_moderator(session_id));

drop policy if exists questions_delete_moderator on public.session_questions;
create policy questions_delete_moderator on public.session_questions
  for delete to authenticated
  using (is_organizer() or is_session_moderator(session_id));

-- Replies and upvotes follow their question: readable only where the
-- question itself is (the subquery runs under the question's own policy).
drop policy if exists replies_select_all on public.question_replies;
drop policy if exists replies_select_visible on public.question_replies;
create policy replies_select_visible on public.question_replies
  for select to authenticated
  using (exists (select 1 from public.session_questions q where q.id = question_replies.question_id));

drop policy if exists upvotes_select_all on public.question_upvotes;
drop policy if exists upvotes_select_visible on public.question_upvotes;
create policy upvotes_select_visible on public.question_upvotes
  for select to authenticated
  using (exists (select 1 from public.session_questions q where q.id = question_upvotes.question_id));

-- ---------------------------------------------------------------------------
-- Expo stalls: organisers add, edit, publish and remove them.
-- ---------------------------------------------------------------------------

drop policy if exists exhibitors_organizer_all on public.exhibitors;
create policy exhibitors_organizer_all on public.exhibitors
  for all to authenticated
  using (is_organizer()) with check (is_organizer());
