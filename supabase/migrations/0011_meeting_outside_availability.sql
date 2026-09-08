-- Flag meetings that were proposed without the invitee having set their
-- availability. Both parties see a "Proposed outside availability" badge
-- on the meeting card and detail page so the context is mutual.
alter table public.meetings
  add column if not exists proposed_outside_availability boolean not null default false;

comment on column public.meetings.proposed_outside_availability is
  'True when the requester proposed times before the invitee published any availability. Surfaced in the UI to both parties.';
