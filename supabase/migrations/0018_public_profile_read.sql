-- Let a signed-out visitor see who wrote a post.
--
-- posts and post_comments already read `to public` with a `true` predicate,
-- so the discussion feed's text and images reach a guest. profiles did not:
-- its only select policy was `to authenticated`, so every author came back
-- empty and the feed showed posts with nobody attached to them.
--
-- Same predicate as the signed-in policy, minus the two clauses that need a
-- session: a hidden profile stays hidden, and a guest is neither its owner
-- nor an organiser.

drop policy if exists profiles_select_public on public.profiles;

create policy profiles_select_public on public.profiles
  for select to anon
  using (visibility <> 'hidden');

-- A policy grants rows, not columns. With the policy above, every column
-- anon holds a grant on becomes readable — including qr_token, which is the
-- gate pass, and push_subscription, which is an endpoint that can be pushed
-- to. Neither belongs to the public, so anon's blanket column grant is
-- replaced with the set the directory and the feed actually render.
revoke select on public.profiles from anon;

grant select (
  id,
  full_name,
  headline,
  bio,
  photo_url,
  role,
  company,
  designation,
  iit_campus,
  graduation_year,
  branch,
  linkedin_url,
  twitter_url,
  city,
  country,
  interests,
  asks,
  offers,
  available_for_meetings,
  visibility,
  office_hours_enabled,
  points,
  badges,
  onboarded,
  created_at,
  updated_at
) on public.profiles to anon;

-- anon was also carrying insert and update grants. No policy lets it write,
-- so nothing changes in practice; this removes the second line of defence's
-- dependence on the first.
revoke insert, update on public.profiles from anon;
