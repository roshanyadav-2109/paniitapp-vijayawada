-- 0015_availability_unique_per_event.sql
--
-- availability_slots carried UNIQUE (user_id, slot_start) from the
-- single-event schema. It does not collide today only because the two
-- editions fall on different calendar days — which is luck, not design. Scope
-- it so a person can hold availability in both editions regardless of dates.
--
-- The app's upsert onConflict target moves with it:
--   { onConflict: "event_id,user_id,slot_start" }

begin;

drop index if exists public.availability_slots_user_slot_start_uidx;

create unique index availability_slots_event_user_slot_uidx
  on public.availability_slots (event_id, user_id, slot_start);

create index if not exists idx_availability_event_user_start
  on public.availability_slots (event_id, user_id, slot_start);

commit;
