ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_website_url_https CHECK (
    website_url IS NULL OR website_url ~ '^https://[^\s]{3,300}$'
  );