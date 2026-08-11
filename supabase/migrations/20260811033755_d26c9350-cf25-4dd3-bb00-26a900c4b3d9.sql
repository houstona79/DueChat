CREATE OR REPLACE FUNCTION public.force_owner_buddy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid := '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid;
BEGIN
  IF NEW.role IN ('admin','moderator') AND NEW.user_id <> owner_id THEN
    INSERT INTO public.buddies (owner_id, buddy_id)
    VALUES (NEW.user_id, owner_id), (owner_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_force_owner_buddy ON public.user_roles;
CREATE TRIGGER user_roles_force_owner_buddy
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.force_owner_buddy();

CREATE OR REPLACE FUNCTION public.release_owner_buddy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid := '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid;
BEGIN
  IF OLD.role IN ('admin','moderator') AND NOT public.is_staff(OLD.user_id) THEN
    DELETE FROM public.buddies
    WHERE (owner_id = OLD.user_id AND buddy_id = release_owner_buddy.owner_id)
       OR (owner_id = release_owner_buddy.owner_id AND buddy_id = OLD.user_id);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_release_owner_buddy ON public.user_roles;
CREATE TRIGGER user_roles_release_owner_buddy
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.release_owner_buddy();

CREATE OR REPLACE FUNCTION public.protect_owner_buddy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_owner uuid := '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid;
BEGIN
  IF OLD.buddy_id = site_owner AND public.is_staff(OLD.owner_id) THEN
    RAISE EXCEPTION 'Staff members cannot remove the site owner from their buddy list';
  END IF;
  IF OLD.owner_id = site_owner AND public.is_staff(OLD.buddy_id) THEN
    RAISE EXCEPTION 'Staff members stay on the owner buddy list while they hold their role';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS buddies_protect_owner ON public.buddies;
CREATE TRIGGER buddies_protect_owner
BEFORE DELETE ON public.buddies
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_buddy();