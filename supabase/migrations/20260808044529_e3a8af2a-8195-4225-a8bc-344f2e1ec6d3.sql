ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_icon_url_https,
  DROP CONSTRAINT IF EXISTS rooms_banner_url_https,
  DROP CONSTRAINT IF EXISTS rooms_website_url_https;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_icon_url_https CHECK (
    icon_url IS NULL OR (icon_url ~* '^https://[^[:space:]]{3,}$' AND length(icon_url) <= 500)
  ),
  ADD CONSTRAINT rooms_banner_url_https CHECK (
    banner_url IS NULL OR (banner_url ~* '^https://[^[:space:]]{3,}$' AND length(banner_url) <= 500)
  ),
  ADD CONSTRAINT rooms_website_url_https CHECK (
    website_url IS NULL OR (website_url ~* '^https://[^[:space:]]{3,}$' AND length(website_url) <= 500)
  );