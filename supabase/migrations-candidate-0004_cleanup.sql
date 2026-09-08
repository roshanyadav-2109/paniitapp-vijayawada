-- CANDIDATE cleanup migration. DO NOT RUN AS-IS.
-- Review each block. Comment out anything you still need.
-- Drops are irreversible — back up first.
--
-- Driver: the app code in this repo never reads/writes these columns.
-- A grep of the codebase (lib/, app/, components/) will confirm.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- phone: auth is email-only as of phase 1; phone is no longer used for sign-in,
-- and is not displayed anywhere in the app. Drop unless you still rely on it
-- in another system (SMS, CRM export).
alter table public.profiles drop column if exists phone;

-- onboarded: no profile-setup wizard exists. The Me tab is the editor.
-- Every seeded attendee is "onboarded" already.
alter table public.profiles drop column if exists onboarded;

-- points: gamification was explicitly cut from the build spec (no points,
-- badges, leaderboards). Safe to drop along with point_events below.
alter table public.profiles drop column if exists points;

-- updated_at: only drop if your seed didn't add this; otherwise keep for audit.
-- alter table public.profiles drop column if exists updated_at;

-- ---------------------------------------------------------------------------
-- point_events (gamification — fully dead)
-- ---------------------------------------------------------------------------
drop table if exists public.point_events cascade;

-- ---------------------------------------------------------------------------
-- Add the available_for_meetings column if you prefer it as a distinct
-- field from office_hours_enabled. The attendee directory and slot picker
-- accept either. If you don't want two columns, drop one.
-- ---------------------------------------------------------------------------
-- alter table public.profiles drop column if exists available_for_meetings;
-- or:
-- alter table public.profiles drop column if exists office_hours_enabled;

-- ---------------------------------------------------------------------------
-- sessions (review)
-- ---------------------------------------------------------------------------
-- If 0001_init has columns like `room_layout`, `live_stream_url`, etc. that
-- aren't used by any UI, add explicit drops here. Leaving commented because
-- I cannot confirm without the original schema.
-- alter table public.sessions drop column if exists room_layout;
-- alter table public.sessions drop column if exists live_stream_url;

-- ---------------------------------------------------------------------------
-- After running, regenerate types:
--   supabase gen types typescript --project-id <id> --schema public \
--     > lib/supabase/types.ts
-- and replace the placeholder `Database = any` in lib/supabase/types.ts.
-- ---------------------------------------------------------------------------
