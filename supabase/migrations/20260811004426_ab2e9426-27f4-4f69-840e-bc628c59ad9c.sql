CREATE OR REPLACE FUNCTION public.profile_points(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT balance FROM public.user_credits WHERE user_id = _user_id), 0)
$$;

GRANT EXECUTE ON FUNCTION public.profile_points(uuid) TO authenticated;