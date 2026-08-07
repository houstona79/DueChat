REVOKE ALL ON FUNCTION public.notify_buddies_of_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_buddies_of_update() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_buddies_of_update() TO service_role;