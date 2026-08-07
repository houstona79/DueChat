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
  SELECT connected.user_id, NEW.user_id, 'update', NEW.id, left(NEW.body, 120)
  FROM (
    SELECT b.owner_id AS user_id
    FROM public.buddies b
    WHERE b.buddy_id = NEW.user_id
    UNION
    SELECT b.buddy_id AS user_id
    FROM public.buddies b
    WHERE b.owner_id = NEW.user_id
  ) AS connected
  WHERE connected.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;