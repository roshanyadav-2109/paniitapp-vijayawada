-- Let a signed-out visitor read the parts of the event that are public.
--
-- Guest browsing shipped in the app but not in the database: sessions,
-- speakers, venues, the expo, the partners and the announcements all had a
-- single select policy `to authenticated`, so the agenda a guest was invited
-- to read came back with nothing in it. The app was not empty — the rows
-- were being filtered away one layer down.
--
-- Same predicates as the signed-in policies. Nothing here is private: it is
-- the programme, the floor and the people on stage.

drop policy if exists sessions_select_public on public.sessions;
create policy sessions_select_public on public.sessions
  for select to anon using (true);

drop policy if exists session_speakers_select_public on public.session_speakers;
create policy session_speakers_select_public on public.session_speakers
  for select to anon using (true);

drop policy if exists venues_select_public on public.venues;
create policy venues_select_public on public.venues
  for select to anon using (true);

drop policy if exists key_participants_select_public on public.key_participants;
create policy key_participants_select_public on public.key_participants
  for select to anon using (is_published = true);

drop policy if exists exhibitors_select_public on public.exhibitors;
create policy exhibitors_select_public on public.exhibitors
  for select to anon using (is_published = true);

drop policy if exists exhibitor_team_select_public on public.exhibitor_team_members;
create policy exhibitor_team_select_public on public.exhibitor_team_members
  for select to anon using (true);

drop policy if exists partners_select_public on public.partners;
create policy partners_select_public on public.partners
  for select to anon using (is_published = true);

drop policy if exists partner_types_select_public on public.partner_types;
create policy partner_types_select_public on public.partner_types
  for select to anon using (true);

drop policy if exists sponsors_select_public on public.sponsors;
create policy sponsors_select_public on public.sponsors
  for select to anon using (true);

drop policy if exists announcements_select_public on public.announcements;
create policy announcements_select_public on public.announcements
  for select to anon using (true);

-- Two of these tables carry columns that are not part of the public record.
-- A policy grants rows, not columns, so each one's blanket column grant is
-- replaced with the set the public pages actually render.
--
-- sponsors: booth_qr_token is what a scanner presents at the booth, and
-- offer_redeem_code is the code a delegate redeems there. Published beside
-- the logo they would both be worthless. contact_email is the sponsor's
-- staff, not a public address.
revoke select on public.sponsors from anon;
grant select (
  id,
  name,
  tier,
  logo_url,
  description,
  website,
  booth_venue_id,
  booth_number,
  offer_title,
  offer_description,
  created_at,
  event_id
) on public.sponsors to anon;

-- exhibitor_team_members: the stand's staff are shown by name and face on
-- the expo page; their email addresses are not.
revoke select on public.exhibitor_team_members from anon;
grant select (
  id,
  exhibitor_id,
  profile_id,
  full_name,
  designation,
  photo_url,
  linkedin_url,
  display_order,
  created_at
) on public.exhibitor_team_members to anon;

-- Read only. No policy grants anon a write on any of these, and these
-- revokes mean the second line of defence no longer depends on the first.
revoke insert, update, delete on public.sessions from anon;
revoke insert, update, delete on public.session_speakers from anon;
revoke insert, update, delete on public.venues from anon;
revoke insert, update, delete on public.key_participants from anon;
revoke insert, update, delete on public.exhibitors from anon;
revoke insert, update, delete on public.exhibitor_team_members from anon;
revoke insert, update, delete on public.partners from anon;
revoke insert, update, delete on public.partner_types from anon;
revoke insert, update, delete on public.sponsors from anon;
revoke insert, update, delete on public.announcements from anon;
