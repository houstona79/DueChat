REVOKE EXECUTE ON FUNCTION public.archive_and_clear_support() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_clear_support() TO service_role;