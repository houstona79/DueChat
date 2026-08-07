ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('female','male','non-binary','other','prefer-not-to-say'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  suffix int := 1;
  dob date;
  accepted timestamptz;
  g text;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    '[^a-zA-Z0-9_]+', '', 'g'
  ));
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  BEGIN
    dob := NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date;
  EXCEPTION WHEN others THEN
    dob := NULL;
  END;

  BEGIN
    accepted := NULLIF(NEW.raw_user_meta_data->>'accepted_eula_at', '')::timestamptz;
  EXCEPTION WHEN others THEN
    accepted := NULL;
  END;

  g := NULLIF(NEW.raw_user_meta_data->>'gender', '');
  IF g IS NOT NULL AND g NOT IN ('female','male','non-binary','other','prefer-not-to-say') THEN
    g := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, avatar_url, status_message,
    birth_date, country, accepted_eula_at, gender
  )
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(NEW.raw_user_meta_data->>'status_message', ''),
    dob,
    NULLIF(NEW.raw_user_meta_data->>'country', ''),
    accepted,
    g
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;