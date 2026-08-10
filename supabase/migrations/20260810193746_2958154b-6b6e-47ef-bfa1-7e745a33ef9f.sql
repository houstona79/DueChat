CREATE TABLE public.credit_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0 AND amount <= 100000),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_grants TO authenticated;
GRANT ALL ON public.credit_grants TO service_role;

ALTER TABLE public.credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all credit grants"
ON public.credit_grants FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Members can view grants they received"
ON public.credit_grants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX credit_grants_user_idx ON public.credit_grants (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _amount integer, _note text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can give credits';
  END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Enter an amount between 1 and 100000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'That member does not exist';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + _amount,
        updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_grants (user_id, granted_by, amount, note)
  VALUES (_user_id, auth.uid(), _amount, nullif(btrim(coalesce(_note, '')), ''));

  INSERT INTO public.notifications (user_id, actor_id, kind, emoji, preview)
  VALUES (_user_id, auth.uid(), 'gift', '🪙',
          left(_amount || ' credits added by staff' || coalesce(' — ' || nullif(btrim(coalesce(_note, '')), ''), ''), 160));

  RETURN new_balance;
END;
$$;