-- Photos and clips on discussion posts.
--
-- The file itself lives in Cloudinary; the row keeps the delivered URL and
-- what kind of thing it is, because an <img> and a <video> are not
-- interchangeable and the extension is not always in the URL.
--
-- Nullable, with no default: a post is still allowed to be words alone, and
-- every row that exists today stays valid.

alter table public.posts
  add column if not exists media_url text,
  add column if not exists media_type text;

-- Only the two kinds the feed can render, and only ever alongside a URL.
alter table public.posts
  drop constraint if exists posts_media_type_check;

alter table public.posts
  add constraint posts_media_type_check check (
    (media_url is null and media_type is null)
    or (media_url is not null and media_type in ('image', 'video'))
  );

-- Delivery is restricted to Cloudinary's CDN. Without this, an author could
-- point the feed's <img>/<video> at any host — a tracking pixel, or a URL
-- that changes what it serves after the fact.
alter table public.posts
  drop constraint if exists posts_media_url_host_check;

alter table public.posts
  add constraint posts_media_url_host_check check (
    media_url is null or media_url like 'https://res.cloudinary.com/%'
  );

comment on column public.posts.media_url is
  'Cloudinary secure_url for an attached photo or clip. Null for text posts.';
comment on column public.posts.media_type is
  'image | video — which element the feed should render. Null for text posts.';
