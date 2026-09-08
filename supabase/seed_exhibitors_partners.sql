-- Sample seed data for the exhibitors directory and the home-tab partner
-- marquees. Requires migration 0006_exhibitors_availability_partners.sql.
--
-- Re-runnable: every insert uses `on conflict do nothing` (or a guarded
-- unique key). Logo URLs are left NULL — the UI falls back to a clean
-- Building2 icon + name tile, so the page renders cleanly even before
-- you upload real artwork. Drop logos into supabase storage later and
-- update the URLs via the dashboard or a follow-up UPDATE.
--
-- Apply in the Supabase SQL editor, or via psql:
--   psql "$DATABASE_URL" -f supabase/seed_exhibitors_partners.sql

begin;

-- ---------------------------------------------------------------------------
-- Exhibitors
-- ---------------------------------------------------------------------------
insert into public.exhibitors (
  name, tagline, about, category, booth_number, location_floor,
  website, display_order, is_published
) values
  (
    'Neural AI Labs',
    'Indigenous foundation models for Indian enterprises.',
    'Neural AI Labs is building India-grounded large language and vision-language models, incubated at the IIT Madras Research Park. Visit the booth to demo their latest 7B model and the on-device inference SDK.',
    'AI',
    'A-12', 'Hall A',
    'https://neuralai.in', 10, true
  ),
  (
    'Silicon Sovereign',
    'Open-source RISC-V silicon for edge & defence.',
    'A semiconductor team out of IIT Bombay shipping production-grade RISC-V cores. Live tape-out walkthrough and EDA workflow demos at the booth.',
    'Semiconductors',
    'A-18', 'Hall A',
    'https://siliconsovereign.com', 20, true
  ),
  (
    'Stratos Mobility',
    'Battery swap infra for last-mile fleets.',
    'Stratos has rolled out 240+ battery-swap stations across Tier-2 cities. Stop by to see the new 4kWh swap pack and the dispatcher console.',
    'Climate',
    'B-04', 'Hall B',
    'https://stratosmobility.in', 30, true
  ),
  (
    'Brahmastra Defence',
    'Autonomous ISR drones for the Indian forces.',
    'Built at the IIT Kanpur incubator. Live flight demos every 30 minutes in the outdoor cage; come early for the long-endurance UAV walkthrough.',
    'Deep Tech',
    'B-09', 'Hall B',
    'https://brahmastra.tech', 40, true
  ),
  (
    'Vidyut Health',
    'Continuous biomarkers for chronic care.',
    'Wearable hardware + ML pipeline that turns ECG and PPG into clinically validated cardiac and diabetic risk scores. CE-marked, in NABH trials.',
    'Healthcare',
    'C-02', 'Hall C',
    'https://vidyut.health', 50, true
  ),
  (
    'Yantra Robotics',
    'Warehouse autonomy stack.',
    'A multi-agent fleet controller and warehouse-grade mobile robots deployed in three Fortune 500 fulfillment centres. Live 6-robot demonstration on the floor.',
    'Robotics',
    'C-11', 'Hall C',
    'https://yantra.so', 60, true
  ),
  (
    'Pravaha Fintech',
    'Programmable rupee rails for businesses.',
    'Building the UPI-native equivalent of Stripe Treasury for Indian SMBs. Sandbox access for builders at the booth.',
    'Fintech',
    'D-05', 'Hall D',
    'https://pravaha.money', 70, true
  ),
  (
    'Krishi.OS',
    'Real-time crop intelligence for FPOs.',
    'Satellite + IoT sensor fusion for hyperlocal advisories. Pilot covering 1.4M acres across MH/KA/AP. Talking partnerships with state governments.',
    'Agritech',
    'D-12', 'Hall D',
    'https://krishi.os', 80, true
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Exhibitor team members
-- (profile_id left NULL — link to real attendee profiles later when known.)
-- ---------------------------------------------------------------------------
with x as (select id, name from public.exhibitors)
insert into public.exhibitor_team_members (
  exhibitor_id, full_name, designation, linkedin_url, display_order
)
select x.id, t.full_name, t.designation, t.linkedin_url, t.display_order
from x
join (values
  ('Neural AI Labs', 'Aarav Mehta',     'Co-founder & CEO',   'https://www.linkedin.com/in/aaravmehta-neuralai/', 1),
  ('Neural AI Labs', 'Priya Iyer',      'Head of Research',   'https://www.linkedin.com/in/priya-iyer-neuralai/',  2),
  ('Neural AI Labs', 'Rohit Kapoor',    'Solutions Engineer', null, 3),

  ('Silicon Sovereign', 'Dr Vishal Joshi', 'CTO',                'https://www.linkedin.com/in/vjoshi-silicon/', 1),
  ('Silicon Sovereign', 'Nidhi Rao',       'Lead Verification',  null, 2),

  ('Stratos Mobility',  'Karan Suri',      'Co-founder',         'https://www.linkedin.com/in/karansuri-stratos/', 1),
  ('Stratos Mobility',  'Anisha Banerjee', 'Head of Operations', null, 2),

  ('Brahmastra Defence','Air Cmde (Retd) Vikram Rana', 'Advisor', null, 1),
  ('Brahmastra Defence','Saumya Pathak', 'Flight Software Lead', null, 2),

  ('Vidyut Health',     'Dr Ananya Krishnan', 'Co-founder, Medical', 'https://www.linkedin.com/in/dranankrish/', 1),
  ('Vidyut Health',     'Harsh Vora',         'Hardware Lead',       null, 2),

  ('Yantra Robotics',   'Tushar Goyal',       'Co-founder & CEO',    'https://www.linkedin.com/in/tushargoyal-yantra/', 1),

  ('Pravaha Fintech',   'Ishaan Bose',        'Co-founder',          null, 1),
  ('Pravaha Fintech',   'Meera Subramanian',  'Head of Compliance',  null, 2),

  ('Krishi.OS',         'Aditya Reddy',       'CEO',                 'https://www.linkedin.com/in/adityareddy-krishi/', 1),
  ('Krishi.OS',         'Lavanya Bhat',       'Field Ops Lead',      null, 2)
) as t(exhibitor_name, full_name, designation, linkedin_url, display_order)
  on x.name = t.exhibitor_name
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Partner types
-- ---------------------------------------------------------------------------
insert into public.partner_types (name, description, display_order) values
  ('Title Partner',     'Headline partner of the summit.',             10),
  ('Platinum Partner',  'Strategic partner with stage and floor presence.', 20),
  ('Gold Partner',      'Premium summit partner.',                     30),
  ('Silver Partner',    'Supporting summit partner.',                  40),
  ('Ecosystem Partner', 'Incubators, accelerators, and community partners.', 50),
  ('Knowledge Partner', 'Research and policy partners.',               60)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Partners
-- ---------------------------------------------------------------------------
with t as (select id, name from public.partner_types)
insert into public.partners (partner_type_id, name, website, display_order, is_published)
select t.id, p.name, p.website, p.display_order, true
from t
join (values
  ('Title Partner',     'Tata Sons',          'https://www.tatasons.com',     10),
  ('Title Partner',     'Reliance Industries','https://www.ril.com',          20),

  ('Platinum Partner',  'Infosys',            'https://www.infosys.com',      10),
  ('Platinum Partner',  'Mahindra Group',     'https://www.mahindra.com',     20),
  ('Platinum Partner',  'L&T Technology',     'https://www.ltts.com',         30),

  ('Gold Partner',      'Bajaj Group',        'https://www.bajaj.com',        10),
  ('Gold Partner',      'HCLTech',            'https://www.hcltech.com',      20),
  ('Gold Partner',      'Wipro',              'https://www.wipro.com',        30),
  ('Gold Partner',      'Tech Mahindra',      'https://www.techmahindra.com', 40),

  ('Silver Partner',    'Zoho',               'https://www.zoho.com',         10),
  ('Silver Partner',    'Freshworks',         'https://www.freshworks.com',   20),
  ('Silver Partner',    'Persistent Systems', 'https://www.persistent.com',   30),
  ('Silver Partner',    'MphasiS',            'https://www.mphasis.com',      40),

  ('Ecosystem Partner', 'NSRCEL, IIM Bangalore', 'https://nsrcel.org',        10),
  ('Ecosystem Partner', 'T-Hub',                 'https://t-hub.co',          20),
  ('Ecosystem Partner', 'IIT Madras Incubation', 'https://incubation.iitm.ac.in', 30),
  ('Ecosystem Partner', 'SINE, IIT Bombay',      'https://www.sineiitb.org',  40),

  ('Knowledge Partner', 'NITI Aayog',         'https://www.niti.gov.in',      10),
  ('Knowledge Partner', 'NASSCOM',            'https://www.nasscom.in',       20),
  ('Knowledge Partner', 'Carnegie India',     'https://carnegieindia.org',    30)
) as p(type_name, name, website, display_order)
  on t.name = p.type_name
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Key participants (used by the home-tab spotlight strip)
-- ---------------------------------------------------------------------------
insert into public.key_participants (
  full_name, designation, company, display_order, is_published
) values
  ('Dr Anil Kakodkar',     'Padma Vibhushan · Former Chairman',   'Atomic Energy Commission of India', 10, true),
  ('Nandan Nilekani',      'Co-founder',                          'Infosys · Founding Chairman, UIDAI', 20, true),
  ('Kris Gopalakrishnan',  'Co-founder',                          'Infosys',                            30, true),
  ('Dr R.A. Mashelkar',    'Padma Vibhushan · National Research Professor', 'CSIR (Former DG)',        40, true),
  ('Jayant Sinha',         'Former Union Minister of State',      'Government of India',                50, true),
  ('Sridhar Vembu',        'Founder & CEO',                       'Zoho Corporation',                   60, true),
  ('Falguni Nayar',        'Founder & CEO',                       'Nykaa',                              70, true),
  ('Dr Tessy Thomas',      'Distinguished Scientist',             'DRDO',                               80, true)
on conflict do nothing;

commit;

-- ---------------------------------------------------------------------------
-- Quick sanity checks (run separately, do not rely on these in production):
--   select count(*) from public.exhibitors;
--   select count(*) from public.exhibitor_team_members;
--   select pt.name, count(p.id) from public.partner_types pt
--     left join public.partners p on p.partner_type_id = pt.id
--     group by pt.name order by min(pt.display_order);
--   select count(*) from public.key_participants;
-- ---------------------------------------------------------------------------
