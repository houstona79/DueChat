CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_token uuid NOT NULL DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT support_tickets_subject_len CHECK (length(subject) BETWEEN 1 AND 140),
  CONSTRAINT support_tickets_guest_name_len CHECK (guest_name IS NULL OR length(guest_name) BETWEEN 1 AND 80),
  CONSTRAINT support_tickets_guest_email_len CHECK (guest_email IS NULL OR length(guest_email) BETWEEN 3 AND 255),
  CONSTRAINT support_tickets_identity CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read every ticket"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members open their own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members close their own tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER support_tickets_set_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_body_len CHECK (length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX support_messages_ticket_idx ON public.support_messages (ticket_id, created_at);
CREATE INDEX support_tickets_status_idx ON public.support_tickets (status, last_message_at DESC);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read messages on their tickets"
ON public.support_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.support_tickets t
  WHERE t.id = support_messages.ticket_id AND t.user_id = auth.uid()
));

CREATE POLICY "Admins read every support message"
ON public.support_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members write on their own tickets"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND from_staff = false
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Admins reply to any ticket"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND from_staff = true
  AND public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      status = CASE WHEN NEW.from_staff THEN status ELSE 'open' END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_messages_touch_ticket
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();