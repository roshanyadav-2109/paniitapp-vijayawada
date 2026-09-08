-- Phase 3: Q&A replies, reply upvotes, and helper columns / triggers.
-- Safe to re-run.

create table if not exists public.question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.session_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  is_official boolean default false,
  upvotes int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_question_replies_question
  on public.question_replies(question_id, created_at);

create table if not exists public.reply_upvotes (
  reply_id uuid references public.question_replies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (reply_id, user_id)
);

alter table public.session_questions
  add column if not exists is_anonymous boolean default false,
  add column if not exists is_pinned boolean default false,
  add column if not exists answered_by uuid references public.profiles(id) on delete set null,
  add column if not exists answered_at timestamptz,
  add column if not exists status text default 'open'
    check (status in ('open','answered','dismissed','duplicate'));

create or replace function public.flag_official_reply()
returns trigger language plpgsql security definer as $$
declare
  v_session_id uuid;
  v_is_speaker boolean;
  v_is_organizer boolean;
begin
  select session_id into v_session_id from public.session_questions where id = new.question_id;
  select exists (
    select 1 from public.session_speakers
    where session_id = v_session_id and speaker_id = new.user_id
  ) into v_is_speaker;
  select exists (
    select 1 from public.profiles
    where id = new.user_id and role in ('organizer','admin')
  ) into v_is_organizer;
  new.is_official = (v_is_speaker or v_is_organizer);
  return new;
end; $$;

drop trigger if exists replies_flag_official on public.question_replies;
create trigger replies_flag_official
  before insert on public.question_replies
  for each row execute function public.flag_official_reply();

create or replace function public.bump_reply_upvotes()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.question_replies set upvotes = upvotes + 1 where id = new.reply_id;
  elsif (tg_op = 'DELETE') then
    update public.question_replies set upvotes = greatest(upvotes - 1, 0) where id = old.reply_id;
  end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists reply_upvotes_bump_counter on public.reply_upvotes;
create trigger reply_upvotes_bump_counter
  after insert or delete on public.reply_upvotes
  for each row execute function public.bump_reply_upvotes();

alter table public.question_replies enable row level security;
alter table public.reply_upvotes enable row level security;

drop policy if exists "replies_select_all" on public.question_replies;
create policy "replies_select_all" on public.question_replies
  for select to authenticated using (true);

drop policy if exists "replies_insert_self" on public.question_replies;
create policy "replies_insert_self" on public.question_replies
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "replies_update_self_or_organizer" on public.question_replies;
create policy "replies_update_self_or_organizer" on public.question_replies
  for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('organizer','admin'))
  );

drop policy if exists "replies_delete_self_or_organizer" on public.question_replies;
create policy "replies_delete_self_or_organizer" on public.question_replies
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('organizer','admin'))
  );

drop policy if exists "reply_upvotes_select_all" on public.reply_upvotes;
create policy "reply_upvotes_select_all" on public.reply_upvotes
  for select to authenticated using (true);

drop policy if exists "reply_upvotes_own" on public.reply_upvotes;
create policy "reply_upvotes_own" on public.reply_upvotes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'question_replies'
  ) then
    alter publication supabase_realtime add table public.question_replies;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reply_upvotes'
  ) then
    alter publication supabase_realtime add table public.reply_upvotes;
  end if;
end $$;
