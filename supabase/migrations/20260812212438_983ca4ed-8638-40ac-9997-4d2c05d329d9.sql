ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mail_forward_to text,
  ADD COLUMN IF NOT EXISTS mail_forward_verified boolean NOT NULL DEFAULT false;