CREATE OR REPLACE FUNCTION public.archive_and_clear_messages()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  moved integer;
BEGIN
  WITH taken AS (
    DELETE FROM public.messages m
    WHERE m.id IS NOT NULL
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
$function$;