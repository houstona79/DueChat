ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.notify_room_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_name text;
BEGIN
  SELECT name INTO _room_name FROM public.rooms WHERE id = NEW.room_id;
  INSERT INTO public.notifications (user_id, actor_id, kind, room_id, preview)
  VALUES (NEW.invitee_id, NEW.inviter_id, 'room_invite', NEW.room_id, _room_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_room_invite_trigger ON public.room_invites;
CREATE TRIGGER notify_room_invite_trigger
AFTER INSERT ON public.room_invites
FOR EACH ROW EXECUTE FUNCTION public.notify_room_invite();

CREATE OR REPLACE FUNCTION public.clear_room_invite_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE kind = 'room_invite'
    AND user_id = OLD.invitee_id
    AND room_id = OLD.room_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS clear_room_invite_notification_trigger ON public.room_invites;
CREATE TRIGGER clear_room_invite_notification_trigger
AFTER DELETE ON public.room_invites
FOR EACH ROW EXECUTE FUNCTION public.clear_room_invite_notification();