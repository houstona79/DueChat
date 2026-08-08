REVOKE ALL ON FUNCTION public.archive_and_clear_messages() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_clear_messages() TO postgres, service_role;