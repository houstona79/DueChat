ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_website_url_https;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_website_url_https CHECK (
    website_url IS NULL OR (website_url ~ '^https://[^[:space:]]{3,}$' AND length(website_url) <= 300)
  );