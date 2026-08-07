CREATE OR REPLACE FUNCTION public.notify_buddies_of_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, kind, update_id, preview)
  SELECT b.owner_id, NEW.user_id, 'update', NEW.id, left(NEW.body, 120)
  FROM public.buddies b
  WHERE b.buddy_id = NEW.user_id
    AND b.owner_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_updates_notify_buddies ON public.profile_updates;
CREATE TRIGGER profile_updates_notify_buddies
AFTER INSERT ON public.profile_updates
FOR EACH ROW EXECUTE FUNCTION public.notify_buddies_of_update();