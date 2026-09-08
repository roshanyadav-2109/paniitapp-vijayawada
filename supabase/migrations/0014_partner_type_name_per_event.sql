-- 0014_partner_type_name_per_event.sql
--
-- partner_types.name carried a global UNIQUE from the single-event schema, so
-- after 0013 the AP summit could not reuse a tier name the Bangalore summit
-- already had ("Ecosystem Partner", "Knowledge Partner", ...). Tier names are
-- only meaningful within an event, so scope the constraint.

begin;

alter table public.partner_types
  drop constraint if exists partner_types_name_key;

alter table public.partner_types
  add constraint partner_types_event_name_key unique (event_id, name);

commit;
