-- seed_ap_key_participants.sql
--
-- Key guests and speakers for the PanIIT Andhra Pradesh Summit 2026,
-- transcribed from the official brochure: the Chief Guest page, the
-- "Distinguished Guests" page, and the two "Key Guests and Speakers" pages
-- (which end with "+ Many More", so this list will grow).
--
-- Idempotent and scoped to the AP event; the Bangalore edition is untouched.
--
-- photo_url is intentionally null: the brochure is an image-only PDF, so the
-- headshots have to be extracted and uploaded separately. The strip falls back
-- to initials on a branded card until then.

begin;

do $seed$
declare
  v_event uuid := 'a9d40000-0000-4000-8000-000000000002';
begin

  delete from public.key_participants where event_id = v_event;

  insert into public.key_participants
    (event_id, full_name, designation, company, display_order, is_published)
  values
    -- Chief guest
    (v_event, 'Sri Nara Chandra Babu Naidu', 'Hon''ble Chief Minister', 'Government of Andhra Pradesh', 1, true),
    (v_event, 'Sri Nara Lokesh', 'Hon''ble Minister for IT, Electronics & Communications', 'Government of Andhra Pradesh', 2, true),

    -- Distinguished guests
    (v_event, 'Sri Sai Prasad Guttapalli, IAS', 'Chief Secretary', 'Government of Andhra Pradesh', 3, true),
    (v_event, 'Sri S. Krishnan', 'Secretary', 'Ministry of Electronics and Information Technology', 4, true),
    (v_event, 'Sri Ajai Chowdhry', 'Co-founder, HCL · Chairman, Mission Governing Board', 'National Quantum Mission of India', 5, true),
    (v_event, 'Dr. Sunil Kumar Barnwal', 'Chief Executive Officer', 'National Health Authority, Ministry of Health and Family Welfare', 6, true),

    -- Key guests and speakers
    (v_event, 'Sri Prudhvi Tej Immadi, IAS', 'Chairman and Managing Director', 'APEPDCL', 7, true),
    (v_event, 'Sri K.S. Viswanadhan, IAS', 'Director of Information and Public Relations', 'Government of Andhra Pradesh', 8, true),
    (v_event, 'Sri V.R.K. Teja Mylavarapu, IAS', 'Commissioner', 'Panchayati Raj', 9, true),
    (v_event, 'Prof. K N Satyamnarayana', 'Director', 'IIT Tirupati', 10, true),
    (v_event, 'Prof. B. S. Murthy', 'Director', 'IIT Hyderabad', 11, true),
    (v_event, 'Prof. Sukumar Mishra', 'Director', 'IIT (ISM) Dhanbad', 12, true),
    (v_event, 'Prof. Shalivahan', 'Director', 'Indian Institute of Petroleum & Energy, Visakhapatnam', 13, true),
    (v_event, 'Arun Ramchandani', 'Senior Vice President & Head', 'L&T Precision Engineering & Systems', 14, true),
    (v_event, 'Dr. Jithendra Sharma', 'Chief Executive Officer', 'AMTZ', 15, true),
    (v_event, 'Sri Amit Singhee', 'Director, IBM Research India & IBM Software Innovation Lab · CTO', 'IBM India & South Asia', 16, true),
    (v_event, 'Sri C Sridhar', 'Director', 'AP State Quantum Mission (APSQM) & Amaravati Quantum Valley', 17, true),
    (v_event, 'Prof. Balaram Ravindran', 'Head, Department of Data Science and AI', 'IIT Madras', 18, true),
    (v_event, 'Sri BH. V. Seshagiri Rao', 'Chief Executive Officer (MC), Retd.', 'HAL, Nasik', 19, true),
    (v_event, 'Sri Shekar Reddy', 'Chairman and Managing Director', 'Crux Biotech & Sri Chakra', 20, true),
    (v_event, 'Sri Ram Bandi', 'Founder & Chief Executive Officer', 'Styrax Instruments India Pvt Ltd, Hyderabad', 21, true),
    (v_event, 'Dr. Vidhya Sagar', 'FCMD', 'Avantel', 22, true);

end
$seed$;

commit;
