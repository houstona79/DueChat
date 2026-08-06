CREATE OR REPLACE FUNCTION public.protect_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id = '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'The owner account cannot lose admin access';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_owner_admin_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_protect_owner ON public.user_roles;
CREATE TRIGGER user_roles_protect_owner
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_admin_role();