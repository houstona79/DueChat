CREATE OR REPLACE FUNCTION public.support_clear_on_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' AND COALESCE(OLD.status, '') <> 'closed' THEN
    DELETE FROM public.support_messages WHERE ticket_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_clear_on_close ON public.support_tickets;
CREATE TRIGGER support_tickets_clear_on_close
AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.support_clear_on_close();