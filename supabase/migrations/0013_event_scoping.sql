-- 0013_event_scoping.sql
--
-- Makes the schema multi-event so the Bangalore (May 2026) and Andhra Pradesh
-- (October 2026) summits can share one Supabase project without seeing each
-- other's content.
--
-- Design notes
-- ------------
-- * `profiles` stays GLOBAL. profiles.id is the auth.users id, so an alum who
--   attends both summits must keep one row. Per-event membership lives in the
--   new `event_participants` table instead. points/badges/qr_token remain
--   global (cumulative across editions) — that is deliberate.
--
-- * Every scoped table gets `event_id NOT NULL` with a DEFAULT of the
--   Bangalore event. That default is a COMPATIBILITY SHIM: the deployed
--   Bangalore app does not send event_id on insert, and without a default this
--   migration would break it the moment it writes. Drop the defaults once both
--   apps set event_id explicitly.
--
-- * Child tables (session_bookmarks, session_checkins, session_questions,
--   question_replies, *_upvotes, session_speakers, sponsor_visits,
--   exhibitor_team_members) are NOT scoped — they reach their event through
--   their parent row. `connections`, `conversations` and `messages` stay
--   global: a conversation between two alumni is not owned by an event.
--
-- * Reads on content tables are `USING true` in RLS, so this migration does
--   NOT make RLS the scoping boundary. Scoping is enforced by the app layer
--   filtering on event_id; the columns and composite FKs here make wrong data
--   impossible to write and easy to detect.

begin;

-- ---------------------------------------------------------------------------
-- 1. events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id              uuid primary key,
  slug            text not null unique,
  name            text not null,
  city            text not null,
  starts_on       date not null,
  -- Local start/end of the event day. suggest_alternative_slots() derives its
  -- proposal window from these instead of a hardcoded date.
  day_start_local time not null default '08:00',
  day_end_local   time not null default '21:00',
  timezone        text not null default 'Asia/Kolkata',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.events is
  'One row per summit edition. Content tables are scoped to these.';

insert into public.events (id, slug, name, city, starts_on, timezone) values
  ('b1a11111-0000-4000-8000-000000000001', 'blr-2026',
   'PAN IIT Bangalore Summit 2026', 'Bengaluru', '2026-05-16', 'Asia/Kolkata'),
  ('a9d40000-0000-4000-8000-000000000002', 'ap-2026',
   'PanIIT Andhra Pradesh Summit 2026', 'Vijayawada', '2026-10-03', 'Asia/Kolkata')
on conflict (id) do nothing;

alter table public.events enable row level security;

drop policy if exists events_select_all on public.events;
create policy events_select_all on public.events
  for select using (true);

drop policy if exists events_organizer_write on public.events;
create policy events_organizer_write on public.events
  for all using (is_organizer()) with check (is_organizer());

-- ---------------------------------------------------------------------------
-- 2. event_id on scoped tables
-- ---------------------------------------------------------------------------

do $migrate$
declare
  v_blr uuid := 'b1a11111-0000-4000-8000-000000000001';
  t text;
  scoped text[] := array[
    'sessions', 'venues', 'sponsors', 'exhibitors', 'partners',
    'partner_types', 'key_participants', 'announcements',
    'attendee_allowlist', 'meetings', 'availability_slots',
    'availability_blocks', 'point_events'
  ];
begin
  foreach t in array scoped loop
    -- Add nullable, backfill, then constrain: safe against a live writer.
    execute format('alter table public.%I add column if not exists event_id uuid', t);
    execute format('update public.%I set event_id = %L where event_id is null', t, v_blr);
    execute format('alter table public.%I alter column event_id set default %L::uuid', t, v_blr);
    execute format('alter table public.%I alter column event_id set not null', t);

    if not exists (
      select 1 from pg_constraint
      where conname = t || '_event_id_fkey'
        and connamespace = 'public'::regnamespace
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (event_id) '
        'references public.events(id) on delete restrict',
        t, t || '_event_id_fkey');
    end if;

    execute format('create index if not exists %I on public.%I (event_id)',
                   'idx_' || t || '_event_id', t);
  end loop;
end
$migrate$;

-- ---------------------------------------------------------------------------
-- 3. event_participants — per-event membership; profiles stay global
-- ---------------------------------------------------------------------------

create table if not exists public.event_participants (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text,
  joined_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists idx_event_participants_profile
  on public.event_participants (profile_id);

-- Every existing profile belongs to the Bangalore edition.
insert into public.event_participants (event_id, profile_id, role)
select 'b1a11111-0000-4000-8000-000000000001', p.id, p.role
from public.profiles p
on conflict (event_id, profile_id) do nothing;

alter table public.event_participants enable row level security;

drop policy if exists event_participants_select_all on public.event_participants;
create policy event_participants_select_all on public.event_participants
  for select using (true);

drop policy if exists event_participants_insert_self on public.event_participants;
create policy event_participants_insert_self on public.event_participants
  for insert with check (profile_id = auth.uid() or is_organizer());

drop policy if exists event_participants_organizer_write on public.event_participants;
create policy event_participants_organizer_write on public.event_participants
  for all using (is_organizer()) with check (is_organizer());

-- ---------------------------------------------------------------------------
-- 4. attendee_allowlist: one allowlist per event, not one globally
--
-- PRIMARY KEY (email) meant a person could only ever be allowlisted for one
-- summit. Sign-in also does .ilike(email).maybeSingle(), which errors on
-- multiple matches — so the lookup must be scoped too.
-- ---------------------------------------------------------------------------

alter table public.attendee_allowlist
  drop constraint if exists attendee_allowlist_pkey;

alter table public.attendee_allowlist
  add constraint attendee_allowlist_pkey primary key (event_id, email);

drop index if exists public.idx_allowlist_event_lower_email;
create unique index idx_allowlist_event_lower_email
  on public.attendee_allowlist (event_id, lower(email));

-- ---------------------------------------------------------------------------
-- 5. Composite FKs — a session cannot point at another event's venue
--
-- Uses the PG15+ "on delete set null (col)" form so only the reference is
-- nulled; event_id is NOT NULL and must survive.
-- ---------------------------------------------------------------------------

alter table public.venues        drop constraint if exists venues_id_event_key;
alter table public.venues        add  constraint venues_id_event_key unique (id, event_id);
alter table public.partner_types drop constraint if exists partner_types_id_event_key;
alter table public.partner_types add  constraint partner_types_id_event_key unique (id, event_id);

alter table public.sessions drop constraint if exists sessions_venue_id_fkey;
alter table public.sessions add constraint sessions_venue_id_fkey
  foreign key (venue_id, event_id) references public.venues (id, event_id)
  on delete set null (venue_id);

alter table public.sponsors drop constraint if exists sponsors_booth_venue_id_fkey;
alter table public.sponsors add constraint sponsors_booth_venue_id_fkey
  foreign key (booth_venue_id, event_id) references public.venues (id, event_id)
  on delete set null (booth_venue_id);

alter table public.exhibitors drop constraint if exists exhibitors_booth_venue_id_fkey;
alter table public.exhibitors add constraint exhibitors_booth_venue_id_fkey
  foreign key (booth_venue_id, event_id) references public.venues (id, event_id)
  on delete set null (booth_venue_id);

alter table public.partners drop constraint if exists partners_partner_type_id_fkey;
alter table public.partners add constraint partners_partner_type_id_fkey
  foreign key (partner_type_id, event_id)
  references public.partner_types (id, event_id)
  on delete set null (partner_type_id);

-- ---------------------------------------------------------------------------
-- 6. suggest_alternative_slots — was hardcoded to 2026-05-16
--
-- The old body pinned the proposal window to Bangalore's summit day, so the AP
-- app would have proposed meetings in May. The window now comes from the
-- events row, and conflict checks are scoped to the event.
-- ---------------------------------------------------------------------------

drop function if exists public.suggest_alternative_slots(uuid, uuid, integer);

create function public.suggest_alternative_slots(
  p_user_a uuid,
  p_user_b uuid,
  p_duration_min integer default 15,
  p_event_id uuid default 'b1a11111-0000-4000-8000-000000000001'
)
returns jsonb
language plpgsql
security definer
as $function$
declare
  v_summit_start timestamptz;
  v_summit_end timestamptz;
  v_now timestamptz := now();
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_conflict int;
  v_results jsonb := '[]'::jsonb;
  v_score int;
  v_candidates jsonb := '[]'::jsonb;
begin
  select (e.starts_on + e.day_start_local) at time zone e.timezone,
         (e.starts_on + e.day_end_local)   at time zone e.timezone
    into v_summit_start, v_summit_end
  from public.events e
  where e.id = p_event_id;

  if v_summit_start is null then
    return '[]'::jsonb;
  end if;

  v_slot_start := greatest(v_summit_start, v_now + interval '10 minutes');
  -- Round up to next 15-min boundary
  v_slot_start := date_trunc('hour', v_slot_start)
                  + (extract(minute from v_slot_start)::int / 15 + 1) * interval '15 minutes';

  while v_slot_start + (p_duration_min || ' minutes')::interval <= v_summit_end loop
    v_slot_end := v_slot_start + (p_duration_min || ' minutes')::interval;

    -- Hard conflict check: any accepted meeting for either user, this event
    select count(*) into v_conflict
    from public.meetings
    where status = 'accepted'
      and event_id = p_event_id
      and (requester_id in (p_user_a, p_user_b) or invitee_id in (p_user_a, p_user_b))
      and (accepted_slot->>'start')::timestamptz < v_slot_end
      and (accepted_slot->>'end')::timestamptz > v_slot_start;

    if v_conflict = 0 then
      -- Score: -5 if either has a bookmarked session in this slot
      v_score := 10;
      if exists (
        select 1 from public.session_bookmarks sb
        join public.sessions s on s.id = sb.session_id
        where sb.user_id in (p_user_a, p_user_b)
          and s.event_id = p_event_id
          and s.start_at < v_slot_end
          and s.end_at > v_slot_start
      ) then
        v_score := v_score - 5;
      end if;

      v_candidates := v_candidates || jsonb_build_object(
        'start', v_slot_start,
        'end', v_slot_end,
        'score', v_score
      );
    end if;

    v_slot_start := v_slot_start + interval '15 minutes';
  end loop;

  select jsonb_agg(c order by (c->>'score')::int desc)
  into v_results
  from (
    select c from jsonb_array_elements(v_candidates) c
    order by (c->>'score')::int desc
    limit 3
  ) sub;

  return coalesce(v_results, '[]'::jsonb);
end;
$function$;

commit;
