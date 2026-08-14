CREATE TABLE public.mail_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  sender_deleted BOOLEAN NOT NULL DEFAULT false,
  recipient_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mail_messages_recipient_idx ON public.mail_messages (recipient_id, created_at DESC);
CREATE INDEX mail_messages_sender_idx ON public.mail_messages (sender_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_messages TO authenticated;
GRANT ALL ON public.mail_messages TO service_role;

ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own mail"
ON public.mail_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Members send mail as themselves"
ON public.mail_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Members update their own mail"
ON public.mail_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Members delete their own mail"
ON public.mail_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);