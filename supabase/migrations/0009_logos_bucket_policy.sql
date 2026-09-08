-- Allow anon + authenticated to LIST + SELECT objects in the LOGOS
-- bucket. Without this, the home-page sponsor block can't enumerate
-- per-tier folders even though individual objects are public via URL.
-- Already applied via the Management API; this file is the source of
-- truth so it travels with the repo.

drop policy if exists "LOGOS bucket public read" on storage.objects;
create policy "LOGOS bucket public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'LOGOS');

drop policy if exists "LOGOS bucket public list" on storage.buckets;
create policy "LOGOS bucket public list" on storage.buckets
  for select to anon, authenticated
  using (id = 'LOGOS' and public = true);
