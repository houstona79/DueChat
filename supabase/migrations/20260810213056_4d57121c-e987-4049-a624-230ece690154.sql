CREATE TABLE public.support_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid,
  ticket_id uuid,
  subject text,
  guest_name text,
  guest_email text,
  member_name text,
  sender_id uuid,
  from_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  sent_at timestamp with time zone NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_logs TO authenticated;
GRANT ALL ON public.support_logs TO service_role;

ALTER TABLE public.support_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read support logs"
ON public.support_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX support_logs_archived_at_idx ON public.support_logs (archived_at DESC);

CREATE OR REPLACE FUNCTION public.archive_and_clear_support()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  moved integer;
BEGIN
  WITH taken AS (
    DELETE FROM public.support_messages m
    WHERE m.id IS NOT NULL
    RETURNING m.id, m.ticket_id, m.sender_id, m.from_staff, m.body, m.created_at
  )
  INSERT INTO public.support_logs (
    message_id, ticket_id, subject, guest_name, guest_email, member_name,
    sender_id, from_staff, body, sent_at
  )
  SELECT t.id, t.ticket_id, st.subject, st.guest_name, st.guest_email,
         p.display_name, t.sender_id, t.from_staff, t.body, t.created_at
  FROM taken t
  LEFT JOIN public.support_tickets st ON st.id = t.ticket_id
  LEFT JOIN public.profiles p ON p.id = st.user_id;

  GET DIAGNOSTICS moved = ROW_COUNT;

  UPDATE public.support_tickets
  SET status = 'closed'
  WHERE status <> 'closed';

  DELETE FROM public.support_logs WHERE archived_at < now() - interval '90 days';

  RETURN moved;
END;
$function$;

SELECT cron.schedule(
  'archive-and-clear-support-nightly',
  '0 4 * * *',
  $$SELECT public.archive_and_clear_support();$$
);