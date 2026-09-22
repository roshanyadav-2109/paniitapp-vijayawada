-- Realtime for the discussion feed, and reliable realtime for meetings.
--
-- The feed was written as a server-rendered page plus router.refresh() after
-- your own actions, so a post, like or comment from anyone else was invisible
-- until you navigated or pulled to refresh. Adding the tables to the
-- publication is what lets the client hear about them.
--
-- meetings was already published, but at the default replica identity: a
-- DELETE (and an UPDATE's old row) carries only the primary key, so a
-- subscription filtered on requester_id or invitee_id — which is how each
-- person listens for their own meetings — never matches one. Full replica
-- identity puts the whole old row in the WAL so the filter can be applied.
-- Both tables are small; the extra WAL is not worth optimising against.

do $$
declare t text;
begin
  foreach t in array array[
    'posts', 'post_comments', 'post_likes', 'poll_votes', 'poll_options'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.meetings replica identity full;
alter table public.post_comments replica identity full;
