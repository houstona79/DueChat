ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pronouns_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS gender_visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pronouns_visibility_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pronouns_visibility_check CHECK (pronouns_visibility IN ('public','buddies'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_visibility_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_visibility_check CHECK (gender_visibility IN ('public','buddies'));