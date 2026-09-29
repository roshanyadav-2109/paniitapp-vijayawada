-- Organisers upload expo stall logos from the admin panel.
--
-- The LOGOS bucket was readable by anyone and writable by nobody but the
-- service role, so every logo went in by hand. Organisers (is_organizer())
-- may now add, replace and remove files in it; everyone else still only
-- reads.
--
-- Safe to re-run.

drop policy if exists "LOGOS organizer insert" on storage.objects;
create policy "LOGOS organizer insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'LOGOS' and public.is_organizer());

drop policy if exists "LOGOS organizer update" on storage.objects;
create policy "LOGOS organizer update" on storage.objects
  for update to authenticated
  using (bucket_id = 'LOGOS' and public.is_organizer())
  with check (bucket_id = 'LOGOS' and public.is_organizer());

drop policy if exists "LOGOS organizer delete" on storage.objects;
create policy "LOGOS organizer delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'LOGOS' and public.is_organizer());
