CREATE TABLE public.device_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_accounts TO authenticated;
GRANT ALL ON public.device_accounts TO service_role;

ALTER TABLE public.device_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own device claims"
ON public.device_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Members claim their own device"
ON public.device_accounts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members refresh own device claim"
ON public.device_accounts FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can release device claims"
ON public.device_accounts FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER device_accounts_set_updated_at
BEFORE UPDATE ON public.device_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Returns true when this browser already belongs to a different member.
CREATE OR REPLACE FUNCTION public.device_claimed_by_other(_device_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.device_accounts
    WHERE device_id = _device_id
      AND user_id <> auth.uid()
  )
  AND NOT public.has_role(auth.uid(), 'admin')
  AND NOT public.has_role(auth.uid(), 'moderator')
$$;

REVOKE ALL ON FUNCTION public.device_claimed_by_other(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.device_claimed_by_other(text) TO authenticated;

-- Records/refreshes this browser's claim for the signed-in member.
CREATE OR REPLACE FUNCTION public.claim_device(_device_id text, _user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  INSERT INTO public.device_accounts (device_id, user_id, user_agent)
  VALUES (_device_id, auth.uid(), left(_user_agent, 300))
  ON CONFLICT (device_id) DO UPDATE
    SET updated_at = now(),
        user_agent = left(_user_agent, 300)
    WHERE public.device_accounts.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_device(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_device(text, text) TO authenticated;