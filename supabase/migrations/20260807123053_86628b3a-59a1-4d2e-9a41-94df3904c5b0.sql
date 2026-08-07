ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

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

  INSERT INTO public.profiles (id, username, display_name, avatar_url, status_message, birth_date)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(NEW.raw_user_meta_data->>'status_message', ''),
    dob
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_adult(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT birth_date <= (current_date - interval '18 years') FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.room_requires_adult(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND rating = 'R')
$$;

CREATE OR REPLACE FUNCTION public.lock_birth_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.birth_date IS NOT NULL AND NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    RAISE EXCEPTION 'Date of birth cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_birth_date ON public.profiles;
CREATE TRIGGER profiles_lock_birth_date BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.lock_birth_date();

DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves" ON public.room_members
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT is_room_banned(room_id, auth.uid())
  AND NOT is_site_banned(auth.uid())
  AND (NOT room_requires_adult(room_id) OR is_adult(auth.uid()))
);

DROP POLICY IF EXISTS "Members can post messages" ON public.messages;
CREATE POLICY "Members can post messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_room_member(room_id, auth.uid())
  AND NOT is_site_banned(auth.uid())
  AND (NOT room_requires_adult(room_id) OR is_adult(auth.uid()))
);