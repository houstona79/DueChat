CREATE OR REPLACE FUNCTION public.log_room_leave()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip logging when the room itself is being deleted (e.g. account deletion cascade).
  IF EXISTS (SELECT 1 FROM public.rooms WHERE id = OLD.room_id) THEN
    INSERT INTO public.room_events (room_id, user_id, kind)
    VALUES (OLD.room_id, OLD.user_id, 'leave');
  END IF;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_room_join()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rooms WHERE id = NEW.room_id) THEN
    INSERT INTO public.room_events (room_id, user_id, kind)
    VALUES (NEW.room_id, NEW.user_id, 'join');
  END IF;
  RETURN NEW;
END;
$function$;