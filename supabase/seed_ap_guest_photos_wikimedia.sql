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
