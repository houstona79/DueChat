-- Private profile fields must not be readable by other members.
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, username, display_name, avatar_url, status_message, name_color,
  name_color_expires_at, country, gender, pronouns, gender_visibility,
  pronouns_visibility, profile_visibility, bio, website_url, mail_handle,
  accepted_eula_at, decoration, last_seen_at, created_at, updated_at
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Owner-only access to the private fields.
CREATE OR REPLACE FUNCTION public.my_private_profile()
RETURNS TABLE (
  birth_date date,
  mail_forward_to text,
  mail_forward_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.birth_date, p.mail_forward_to, p.mail_forward_verified
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_private_profile() TO authenticated;

-- Age checks stay possible without exposing birth dates.
REVOKE ALL ON FUNCTION public.is_adult(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_adult(uuid) TO authenticated;