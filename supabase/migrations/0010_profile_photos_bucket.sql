-- Storage policies for the profile-photos bucket.
-- Already applied via the Management API; this file is the source of
-- truth so the policy travels with the repo.
--
-- Layout convention: each user's photo lives at
--   profile-photos/<user-id>/<filename>
-- The first path segment must equal auth.uid()::text so owners can
-- upload/update/delete only their own object. Anyone may SELECT
-- because the bucket is marked public.

drop policy if exists "profile photos public read" on storage.objects;
create policy "profile photos public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists "profile photos owner write" on storage.objects;
create policy "profile photos owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile photos owner update" on storage.objects;
create policy "profile photos owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile photos owner delete" on storage.objects;
create policy "profile photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Expose the bucket row itself to the same audiences so client SDKs
-- can verify the upload target.
drop policy if exists "profile-photos bucket public list" on storage.buckets;
create policy "profile-photos bucket public list" on storage.buckets
  for select to anon, authenticated
  using (id = 'profile-photos' and public = true);
