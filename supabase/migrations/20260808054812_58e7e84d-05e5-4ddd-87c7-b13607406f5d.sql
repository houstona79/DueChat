CREATE TABLE public.message_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid,
  room_id uuid,
  room_name text,
  room_slug text,
  is_direct boolean NOT NULL DEFAULT false,
  user_id uuid,
  username text,
  display_name text,
  body text NOT NULL,
  sent_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.message_logs TO authenticated;
GRANT ALL ON public.message_logs TO service_role;

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read message logs"
ON public.message_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX message_logs_sent_at_idx ON public.message_logs (sent_at DESC);
CREATE INDEX message_logs_room_idx ON public.message_logs (room_id, sent_at DESC);

CREATE OR REPLACE FUNCTION public.archive_and_clear_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved integer;
BEGIN
  WITH taken AS (
    DELETE FROM public.messages m
    RETURNING m.id, m.room_id, m.user_id, m.body, m.created_at
  )
  INSERT INTO public.message_logs (
    message_id, room_id, room_name, room_slug, is_direct,
    user_id, username, display_name, body, sent_at
  )
  SELECT t.id, t.room_id, r.name, r.slug, COALESCE(r.is_direct, false),
         t.user_id, p.username, p.display_name, t.body, t.created_at
  FROM taken t
  LEFT JOIN public.rooms r ON r.id = t.room_id
  LEFT JOIN public.profiles p ON p.id = t.user_id;

  GET DIAGNOSTICS moved = ROW_COUNT;

  DELETE FROM public.message_logs WHERE archived_at < now() - interval '90 days';

  RETURN moved;
END;
$$;