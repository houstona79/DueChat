CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own invite code"
ON public.invite_codes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff read invite codes"
ON public.invite_codes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER invite_codes_set_updated_at
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see their own invites"
ON public.invite_redemptions FOR SELECT TO authenticated
USING (auth.uid() = inviter_id OR auth.uid() = invited_id);

CREATE POLICY "Staff see all invites"
ON public.invite_redemptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Random, URL-safe invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Returns (creating if needed) the signed-in member's invite code
CREATE OR REPLACE FUNCTION public.my_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  SELECT code INTO existing FROM public.invite_codes WHERE user_id = auth.uid();
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;
  INSERT INTO public.invite_codes (user_id, code)
  VALUES (auth.uid(), public.generate_invite_code())
  ON CONFLICT (user_id) DO NOTHING;
  SELECT code INTO existing FROM public.invite_codes WHERE user_id = auth.uid();
  RETURN existing;
END;
$$;

-- Public lookup so the invite page can greet visitors
CREATE OR REPLACE FUNCTION public.invite_owner(_code text)
RETURNS TABLE (username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username, p.display_name, p.avatar_url
  FROM public.invite_codes ic
  JOIN public.profiles p ON p.id = ic.user_id
  WHERE ic.code = lower(_code)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.invite_owner(text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_owner(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_invite_code() TO authenticated, service_role;

-- Record redemption + mutual buddies on signup
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
  invite text;
  inviter uuid;
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
    birth_date, country, accepted_eula_at, gender, pronouns
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
    g,
    left(NULLIF(NEW.raw_user_meta_data->>'pronouns', ''), 40)
  )
  ON CONFLICT (id) DO NOTHING;

  invite := lower(NULLIF(NEW.raw_user_meta_data->>'invite_code', ''));
  IF invite IS NOT NULL THEN
    SELECT user_id INTO inviter FROM public.invite_codes WHERE code = invite;
    IF inviter IS NOT NULL AND inviter <> NEW.id THEN
      INSERT INTO public.invite_redemptions (inviter_id, invited_id, code)
      VALUES (inviter, NEW.id, invite)
      ON CONFLICT (invited_id) DO NOTHING;

      INSERT INTO public.buddies (owner_id, buddy_id)
      VALUES (inviter, NEW.id), (NEW.id, inviter)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;