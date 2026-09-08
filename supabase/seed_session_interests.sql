-- Tag every existing session with the interest array that matches its track.
-- Apply this AFTER migration 0007_session_interests.sql has been run.
-- Mirrors lib/constants.ts TRACK_TO_INTERESTS so the agenda's Recommended
-- pill + filter pick up the same tags the UI uses for matchmaking.
--
-- Idempotent: every row gets overwritten with the mapped array each time
-- you run this, so any drift in the constants file can be re-applied by
-- re-running the script.

begin;

-- ai -> AI & Machine Learning, Dev Tools
update public.sessions
set interests = array['AI & Machine Learning','Dev Tools']
where lower(track) = 'ai';

-- deeptech -> Deep Tech, Robotics, Semiconductors, Hardware, Space
update public.sessions
set interests = array['Deep Tech','Robotics','Semiconductors','Hardware','Space']
where lower(track) = 'deeptech';

-- policy -> Public Policy
update public.sessions
set interests = array['Public Policy']
where lower(track) = 'policy';

-- investor -> Fundraising
update public.sessions
set interests = array['Fundraising']
where lower(track) = 'investor';

-- workshop -> Dev Tools
update public.sessions
set interests = array['Dev Tools']
where lower(track) = 'workshop';

-- founders -> Fundraising
update public.sessions
set interests = array['Fundraising']
where lower(track) = 'founders';

-- climate -> Climate / Energy
update public.sessions
set interests = array['Climate / Energy']
where lower(track) = 'climate';

-- fintech -> Fintech
update public.sessions
set interests = array['Fintech']
where lower(track) = 'fintech';

-- keynote / general / anything else -> NULL so they show no recommendation tag
update public.sessions
set interests = null
where lower(track) in ('keynote', 'general')
   or lower(track) is null
   or lower(track) not in
      ('ai','deeptech','policy','investor','workshop','founders','climate','fintech');

commit;

-- Sanity check after running:
--   select track, count(*) filter (where interests is not null) as tagged,
--          count(*) as total from public.sessions group by track order by track;
