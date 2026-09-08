-- seed_ap_key_participant_photos.sql
--
-- Headshots for the AP key guests, sourced from the official brochure rather
-- than from image search: the brochure photos are already rights-cleared for
-- this event and are guaranteed to be the right person, which a web search is
-- not. Cropped from the page bitmaps, squared to 600x600 and uploaded to the
-- public 'speakers' bucket under the ap-2026/ prefix.
--
-- Sri Nara Lokesh is named in the programme but has no photo in the brochure,
-- so his stays null and the strip falls back to initials.
--
-- Idempotent; scoped to the AP event.

begin;

update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/immadi.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Prudhvi Tej Immadi, IAS';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/viswanadhan.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri K.S. Viswanadhan, IAS';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/teja.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri V.R.K. Teja Mylavarapu, IAS';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/satyam.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Prof. K N Satyamnarayana';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/murthy.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Prof. B. S. Murthy';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/mishra.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Prof. Sukumar Mishra';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/shalivahan.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Prof. Shalivahan';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/arun.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Arun Ramchandani';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/jithendra.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Dr. Jithendra Sharma';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/singhee.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Amit Singhee';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/sridhar.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri C Sridhar';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/ravindran.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Prof. Balaram Ravindran';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/seshagiri.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri BH. V. Seshagiri Rao';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/shekar.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Shekar Reddy';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/rambandi.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Ram Bandi';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/vidhyasagar.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Dr. Vidhya Sagar';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/guttapalli.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Sai Prasad Guttapalli, IAS';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/krishnan.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri S. Krishnan';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/ajai.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Ajai Chowdhry';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/barnwal.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Dr. Sunil Kumar Barnwal';
update public.key_participants set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/naidu.webp'
  where event_id = 'a9d40000-0000-4000-8000-000000000002' and full_name = 'Sri Nara Chandra Babu Naidu';

commit;

-- ---------------------------------------------------------------------------
-- Image spec for the speakers bucket — read before re-uploading anything.
--
-- Files must be 640x700 (aspect 0.914), produced with sharp's fit:'cover',
-- position:'top'. Do NOT use fit:'contain'.
--
-- Why: the card's photo box is h-[82%] of a 3/4 card, so its aspect is
-- 1 / (0.82 * 4/3) = 0.914. Matching that exactly means the browser crops
-- nothing further.
--
-- 'contain' was used at one point to stop the photos looking zoomed. It pads
-- to the target box with a background colour, and because the brochure crops
-- are landscape (~520x470) that baked white bars into the top and bottom of
-- every file — measured at 41 rows top and 28 rows bottom on a 600x600
-- upload. Those bars then showed in the card as a white band between the
-- photo and the arc, which looked like a layout bug but was inside the image.
-- ---------------------------------------------------------------------------
