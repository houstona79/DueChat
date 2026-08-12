ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mail_handle text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mail_handle_format
  CHECK (mail_handle IS NULL OR mail_handle ~ '^[a-z0-9][a-z0-9._-]{2,23}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_mail_handle_key ON public.profiles (mail_handle) WHERE mail_handle IS NOT NULL;