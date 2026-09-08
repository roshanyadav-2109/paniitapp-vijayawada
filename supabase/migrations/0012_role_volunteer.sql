-- Add 'volunteer' to the allowed profile roles so on-ground staff with QR
-- verification responsibilities can be distinguished from attendees and
-- organisers. The role gates the "Verify Attendee" entry-point in the UI.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role in (
      'attendee',
      'founder',
      'vc',
      'speaker',
      'government',
      'press',
      'organizer',
      'admin',
      'volunteer'
    )
  );
