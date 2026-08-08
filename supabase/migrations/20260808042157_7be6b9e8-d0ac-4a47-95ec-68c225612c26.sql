ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS website_label text;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_icon_url_https CHECK (icon_url IS NULL OR icon_url ~* '^https://\S{3,500}$'),
  ADD CONSTRAINT rooms_banner_url_https CHECK (banner_url IS NULL OR banner_url ~* '^https://\S{3,500}$'),
  ADD CONSTRAINT rooms_website_url_https CHECK (website_url IS NULL OR website_url ~* '^https://\S{3,500}$'),
  ADD CONSTRAINT rooms_website_label_len CHECK (website_label IS NULL OR char_length(website_label) <= 60);