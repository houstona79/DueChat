CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.member_mailboxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'google_workspace',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  provider_user_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.member_mailboxes TO authenticated;
GRANT ALL ON public.member_mailboxes TO service_role;

ALTER TABLE public.member_mailboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own mailbox" ON public.member_mailboxes;
CREATE POLICY "Members read their own mailbox"
  ON public.member_mailboxes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff read all mailboxes" ON public.member_mailboxes;
CREATE POLICY "Staff read all mailboxes"
  ON public.member_mailboxes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP TRIGGER IF EXISTS member_mailboxes_updated_at ON public.member_mailboxes;
CREATE TRIGGER member_mailboxes_updated_at
  BEFORE UPDATE ON public.member_mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();