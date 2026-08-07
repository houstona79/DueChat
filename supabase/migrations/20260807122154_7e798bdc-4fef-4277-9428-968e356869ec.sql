ALTER TABLE public.rooms
  ADD COLUMN youtube_url text,
  ADD COLUMN youtube_title text;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_youtube_url_https CHECK (youtube_url IS NULL OR youtube_url ~* '^https://');