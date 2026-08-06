CREATE TABLE public.room_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('join','leave')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX room_events_room_created_idx ON public.room_events (room_id, created_at);

GRANT SELECT ON public.room_events TO authenticated;
GRANT ALL ON public.room_events TO service_role;

ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read room activity"
  ON public.room_events FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.log_room_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_events (room_id, user_id, kind)
  VALUES (NEW.room_id, NEW.user_id, 'join');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_room_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_events (room_id, user_id, kind)
  VALUES (OLD.room_id, OLD.user_id, 'leave');
  RETURN OLD;
END;
$$;

CREATE TRIGGER room_members_log_join
AFTER INSERT ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.log_room_join();

CREATE TRIGGER room_members_log_leave
AFTER DELETE ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.log_room_leave();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_events;