-- seed_ap_agenda.sql
--
-- Venues and the full program schedule for the PanIIT Andhra Pradesh Summit
-- 2026, transcribed from the official brochure ("PROGRAM SCHEDULE" page).
--
-- Idempotent: clears this event's sessions and venues, then reinserts. Scoped
-- to the AP event id throughout, so the Bangalore edition is untouched.
--
-- Two sessions publish no end time in the brochure ("-"): the CM's arrival and
-- the National Anthem. They are given nominal 15-minute blocks so they render
-- on the agenda; adjust once the final run sheet lands.

begin;

do $seed$
declare
  v_event uuid := 'a9d40000-0000-4000-8000-000000000002';
  v_main  uuid := 'a9d40001-0000-4000-8000-000000000001';
  v_expo  uuid := 'a9d40001-0000-4000-8000-000000000002';
  v_lounge uuid := 'a9d40001-0000-4000-8000-000000000003';
begin

  -- Child rows first: session_speakers/bookmarks/etc. cascade from sessions.
  delete from public.sessions where event_id = v_event;
  delete from public.venues   where event_id = v_event;

  insert into public.venues (id, event_id, name, floor, capacity, description, map_floor, map_x, map_y) values
    (v_main,   v_event, 'Main Auditorium',    'Ground', 900, 'Dr. B. R. Ambedkar Kala Vedika — main stage for keynotes, panels and the closing block.', 0, 50, 40),
    (v_expo,   v_event, 'Innovation Pavilion','Ground', 400, 'Technology exhibition and startup pavilions.', 0, 20, 65),
    (v_lounge, v_event, 'Networking Lounge',  'Ground', 300, 'Registration, tea and networking lunch.', 0, 78, 65);

  insert into public.sessions
    (id, event_id, title, description, track, start_at, end_at, venue_id, session_type, capacity, is_featured)
  values
    ('a9d40002-0000-4000-8000-000000000001', v_event,
     'Registration, Networking & Tea', null, 'general',
     '2026-10-03 08:00:00+05:30', '2026-10-03 09:00:00+05:30', v_lounge, 'networking', 900, false),

    ('a9d40002-0000-4000-8000-000000000002', v_event,
     'Lighting of the Lamp & Welcome Address', null, 'keynote',
     '2026-10-03 09:00:00+05:30', '2026-10-03 09:15:00+05:30', v_main, 'keynote', 900, true),

    ('a9d40002-0000-4000-8000-000000000003', v_event,
     'Inaugural Ceremony',
     'Chief guest: Sri Lokesh Nara, Hon''ble Minister for IT, Electronics and Communications, Andhra Pradesh.',
     'keynote',
     '2026-10-03 09:15:00+05:30', '2026-10-03 10:00:00+05:30', v_main, 'keynote', 900, true),

    ('a9d40002-0000-4000-8000-000000000004', v_event,
     'Panel 1: Energy & Fuel Cost Optimisation',
     'Swachh Andhra.', 'climate',
     '2026-10-03 10:00:00+05:30', '2026-10-03 10:45:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000005', v_event,
     'Panel 2: Deep Tech in All Walks of Life',
     'Quantum, semiconductors and AI. Product Perfection.', 'deeptech',
     '2026-10-03 10:45:00+05:30', '2026-10-03 11:30:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000006', v_event,
     'Panel 3: Space & Defence Manufacturing',
     'Product Perfection.', 'deeptech',
     '2026-10-03 11:30:00+05:30', '2026-10-03 12:15:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000007', v_event,
     'Panel 4: BioValley — Health Access & Screening at Scale',
     'Zero Poverty.', 'general',
     '2026-10-03 12:15:00+05:30', '2026-10-03 13:00:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000008', v_event,
     'Networking Lunch', null, 'general',
     '2026-10-03 13:00:00+05:30', '2026-10-03 14:00:00+05:30', v_lounge, 'meal', 900, false),

    -- Brochure lists no end time for this item.
    ('a9d40002-0000-4000-8000-000000000009', v_event,
     'Hon''ble Chief Minister — Arrival at Venue', null, 'keynote',
     '2026-10-03 14:00:00+05:30', '2026-10-03 14:15:00+05:30', v_main, 'keynote', 900, true),

    ('a9d40002-0000-4000-8000-000000000010', v_event,
     'CM''s Visit to Pavilions & Technology Exhibition', null, 'general',
     '2026-10-03 14:00:00+05:30', '2026-10-03 14:30:00+05:30', v_expo, 'exhibit', 400, true),

    ('a9d40002-0000-4000-8000-000000000011', v_event,
     'Panel 5: Agri Tech',
     'Farmers & Water Security.', 'climate',
     '2026-10-03 14:00:00+05:30', '2026-10-03 14:45:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000012', v_event,
     'Skilling & Entrepreneurship by IIT Madras Pravarthak', null, 'founders',
     '2026-10-03 14:45:00+05:30', '2026-10-03 15:00:00+05:30', v_main, 'keynote', 900, true),

    ('a9d40002-0000-4000-8000-000000000013', v_event,
     'AI in Governance', 'Address or two talks.', 'policy',
     '2026-10-03 15:00:00+05:30', '2026-10-03 15:30:00+05:30', v_main, 'keynote', 900, true),

    ('a9d40002-0000-4000-8000-000000000014', v_event,
     'Networking Tea', null, 'general',
     '2026-10-03 15:30:00+05:30', '2026-10-03 16:00:00+05:30', v_lounge, 'break', 900, false),

    ('a9d40002-0000-4000-8000-000000000015', v_event,
     'Summary Presentations of All 5 Panels', null, 'general',
     '2026-10-03 16:00:00+05:30', '2026-10-03 17:00:00+05:30', v_main, 'panel', 900, true),

    ('a9d40002-0000-4000-8000-000000000016', v_event,
     'CM Closing Block',
     'Proceeding to main stage — all speakers and roundtable chairs seated; the Hon''ble Chief Minister joins the stage.',
     'keynote',
     '2026-10-03 17:00:00+05:30', '2026-10-03 18:00:00+05:30', v_main, 'keynote', 900, true),

    -- Brochure lists no end time for this item.
    ('a9d40002-0000-4000-8000-000000000017', v_event,
     'National Anthem — Closing Ceremony', null, 'keynote',
     '2026-10-03 18:00:00+05:30', '2026-10-03 18:15:00+05:30', v_main, 'keynote', 900, true);

end
$seed$;

commit;
