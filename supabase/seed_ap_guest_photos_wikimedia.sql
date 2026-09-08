-- seed_ap_guest_photos_wikimedia.sql
--
-- Swaps in freely-licensed portraits from Wikimedia Commons for the guests who
-- have one, in place of the brochure crops.
--
-- Only three of the twenty-two do. The rest — the IAS officers, IIT directors
-- and company heads — have no Wikipedia page, or a page with no photo, so
-- there is no public image that can be attached to their name with confidence.
-- They keep their brochure headshot, which is both accurate and already
-- cleared for this event. Guessing from image search would risk putting the
-- wrong face against a named dignitary.
--
-- Sri Nara Lokesh had no brochure photo at all, so this is a net gain for him.
--
-- ATTRIBUTION — these licences carry conditions:
--
--   N. Chandrababu Naidu
--     https://commons.wikimedia.org/wiki/File:The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg
--     Licence: GODL-India · Author: Press Information Bureau, Prime Minister's Office
--
--   Nara Lokesh
--     https://commons.wikimedia.org/wiki/File:Nara_Lokesh_at_CII_Partnership_Summit_2025,_Visakhapatnam.jpg
--     Licence: CC BY-SA 4.0 · Author: Saiphani02
--     NOTE: CC BY-SA requires visible attribution wherever the image is shown.
--     Either surface a credit line in the app or fall back to another image.
--
--   Ajai Chowdhry
--     https://commons.wikimedia.org/wiki/File:Ajai_Chowdhry.jpg
--     Licence: CC0 (public domain) · Author: Rejo-tmt1
--
-- Hotlinked to upload.wikimedia.org rather than re-hosted, per instruction;
-- next.config.ts allows that host. If the Commons file is renamed the link
-- breaks, and the strip falls back to initials.

begin;

update public.key_participants
   set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a8/The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri Nara Chandra Babu Naidu';

update public.key_participants
   set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Nara_Lokesh_at_CII_Partnership_Summit_2025%2C_Visakhapatnam.jpg/960px-Nara_Lokesh_at_CII_Partnership_Summit_2025%2C_Visakhapatnam.jpg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri Nara Lokesh';

update public.key_participants
   set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Ajai_Chowdhry.jpg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri Ajai Chowdhry';

commit;

-- ---------------------------------------------------------------------------
-- Follow-up: Nara Lokesh portrait replaced at the organisers' request.
--
-- The Commons image was a conference shot with a banner behind him. This one
-- is a clean press portrait that crops well to the card's square photo area.
--
--   https://www.deccanchronicle.com/h-upload/2026/02/27/2016043-nara-lokesh.webp
--   Source: Deccan Chronicle. All rights reserved — unlike the Commons images
--   above this carries no open licence, so clear reuse with the publisher if
--   this ships publicly.
--
-- Hotlinked; www.deccanchronicle.com is allowed in next.config.ts. A news CDN
-- is less stable than Commons, so if it starts 404ing or blocking hotlinks the
-- card falls back to initials — re-host to the speakers bucket if that matters.
-- ---------------------------------------------------------------------------

begin;

update public.key_participants
   set photo_url = 'https://www.deccanchronicle.com/h-upload/2026/02/27/2016043-nara-lokesh.webp'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri Nara Lokesh';

commit;

-- ---------------------------------------------------------------------------
-- Follow-up: Prof. Balaram Ravindran portrait, supplied by the organisers.
--
--   https://wsai.iitm.ac.in/~ravi/img/1C2A3688%20Large.jpeg
--   Source: his own IIT Madras (WSAI) faculty page — authoritative for
--   identity. A studio portrait on a plain background, 1270x1280, so it lands
--   in the card's square photo area with essentially no crop.
--
-- wsai.iitm.ac.in allowed in next.config.ts. No explicit licence is stated on
-- the page; it is the subject's own institutional page, which is the usual
-- source for a speaker headshot, but confirm with him if this ships publicly.
-- ---------------------------------------------------------------------------

begin;

update public.key_participants
   set photo_url = 'https://wsai.iitm.ac.in/~ravi/img/1C2A3688%20Large.jpeg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Prof. Balaram Ravindran';

commit;

-- ---------------------------------------------------------------------------
-- Follow-up: three more portraits supplied by the organisers.
--
-- Two of the three source URLs carry expiring tokens, so those are re-hosted
-- to the speakers bucket rather than hotlinked. The source is recorded here.
--
--   Prof. Balaram Ravindran — HOTLINKED
--     https://wsai.iitm.ac.in/~ravi/img/1C2A3688%20Large.jpeg
--     His own IIT Madras (WSAI) faculty page. Clean URL, no token. Studio
--     portrait, 1270x1280, lands in the square photo area with no crop.
--
--   Sri S. Krishnan — RE-HOSTED
--     from https://www.semiconindia.org/.../Mr.%20S%20Krishnan%20Secretary%20MeitY.jpg.webp?h=...&itok=...
--     The itok is a Drupal image-derivative token and changes if the site's
--     hash salt is rotated, which would silently break the card. 285x285
--     source, so it is slightly soft on high-DPI screens.
--
--   Sri Amit Singhee — RE-HOSTED
--     from https://media.licdn.com/dms/image/v2/D5603AQFRudoa50w7Bg/...?e=1790208000&...
--     The LinkedIn CDN signs URLs with an expiry: e=1790208000 is
--     2026-09-24. Hotlinking it would have broken the card 16 days after it
--     was added, and well before the summit on 3 October.
--
-- Rights: none of these three carry an explicit reuse licence. They are
-- institutional/press/profile photos of the named person, which is the usual
-- source for a speaker headshot — worth confirming before public launch.
-- ---------------------------------------------------------------------------

begin;

update public.key_participants
   set photo_url = 'https://wsai.iitm.ac.in/~ravi/img/1C2A3688%20Large.jpeg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Prof. Balaram Ravindran';

update public.key_participants
   set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/krishnan.webp'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri S. Krishnan';

update public.key_participants
   set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/singhee.webp'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri Amit Singhee';

commit;

-- Dr. Sunil Kumar Barnwal — RE-HOSTED
--   from https://pbs.twimg.com/profile_images/1988140859318300676/v1DZbdC3_400x400.jpg
--   Twitter/X profile image. The id in the path changes when the account
--   updates its photo, so this is re-hosted rather than hotlinked. 400x400
--   source, so slightly soft at 2x.
update public.key_participants
   set photo_url = 'https://fncnndrexzmqqengbkvi.supabase.co/storage/v1/object/public/speakers/ap-2026/barnwal.webp'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Dr. Sunil Kumar Barnwal';

-- Prof. K N Satyamnarayana — HOTLINKED
--   https://cee.iittp.ac.in/images/civil/faculty/director.jpg
--   IIT Tirupati's own site, filed under faculty/director — he is the
--   Director, so the source is authoritative for identity. Clean URL, no
--   token. 3114x3050, so plenty of resolution; next/image downsizes it.
update public.key_participants
   set photo_url = 'https://cee.iittp.ac.in/images/civil/faculty/director.jpg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Prof. K N Satyamnarayana';

-- Sri C Sridhar — HOTLINKED
--   https://media.assettype.com/businessindia%2F2026-05-07%2Fs2pyt2dz%2FFocus-2.jpeg
--   Business India press portrait on the Assettype CDN. Clean URL, no token.
--   Matches the brochure headshot (same shirt and jacket), which confirms
--   identity. 1020x1249 portrait; object-top keeps the head in the square.
update public.key_participants
   set photo_url = 'https://media.assettype.com/businessindia%2F2026-05-07%2Fs2pyt2dz%2FFocus-2.jpeg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Sri C Sridhar';

-- Dr. Vidhya Sagar — HOTLINKED
--   https://images.stocklens.co.in/ceo-images/774_Dr._Abburi_Vidyasagar.jpg
--   400x400, clean URL, no token. The filename names him outright
--   (Dr. Abburi Vidyasagar, CMD of Avantel), and the portrait matches the
--   brochure headshot — same balding pattern, face and light blue shirt.
--
--   A ceoinsightsindia.com URL was tried first and applied on request, then
--   replaced: at 227x227 it was below the card's render size, and side by side
--   with the brochure and this image it appears to be a DIFFERENT person —
--   markedly different hair and face shape.
update public.key_participants
   set photo_url = 'https://images.stocklens.co.in/ceo-images/774_Dr._Abburi_Vidyasagar.jpg'
 where event_id = 'a9d40000-0000-4000-8000-000000000002'
   and full_name = 'Dr. Vidhya Sagar';
