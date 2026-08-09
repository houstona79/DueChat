CREATE OR REPLACE FUNCTION public.notify_admins_of_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subj text;
BEGIN
  IF NEW.from_staff THEN
    RETURN NEW;
  END IF;

  SELECT subject INTO subj FROM public.support_tickets WHERE id = NEW.ticket_id;

  INSERT INTO public.notifications (user_id, actor_id, kind, preview)
  SELECT ur.user_id, NEW.sender_id, 'support', left(COALESCE(subj || ' — ', '') || NEW.body, 160)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_messages_notify_admins ON public.support_messages;
CREATE TRIGGER support_messages_notify_admins
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_support_message();