-- A photo or a video can be a post on its own.
--
-- Every post had to carry at least one character of text, so a picture
-- from the floor had to come with a caption or not at all. The text may now
-- be empty when there is a photo or video with it; a post with neither is
-- still refused, and a poll still needs its question (checked in the app).
--
-- Safe to re-run.

alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check (
  length(btrim(body)) <= 2000
  and (length(btrim(body)) >= 1 or media_url is not null)
);
