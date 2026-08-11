ALTER TABLE public.gift_items
  ADD COLUMN IF NOT EXISTS credit_payout integer NOT NULL DEFAULT 0;

INSERT INTO public.gift_items (key, label, emoji, cost, sort_order, credit_payout)
VALUES ('credit_pack_200', '200 point pack', '🪙', 300, 100, 200)
ON CONFLICT (key) DO UPDATE
  SET label = excluded.label,
      emoji = excluded.emoji,
      cost = excluded.cost,
      sort_order = excluded.sort_order,
      credit_payout = excluded.credit_payout;

CREATE OR REPLACE FUNCTION public.send_gift(_recipient uuid, _gift_key text, _room_id uuid DEFAULT NULL::uuid, _note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item public.gift_items;
  remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _recipient = auth.uid() THEN
    RAISE EXCEPTION 'You cannot send a gift to yourself';
  END IF;
  IF public.is_site_banned(auth.uid()) THEN
    RAISE EXCEPTION 'You cannot send gifts';
  END IF;
  SELECT * INTO item FROM public.gift_items WHERE key = _gift_key;
  IF item.key IS NULL THEN
    RAISE EXCEPTION 'That gift does not exist';
  END IF;

  INSERT INTO public.user_credits (user_id, balance) VALUES (auth.uid(), 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET balance = balance - item.cost, updated_at = now()
  WHERE user_id = auth.uid() AND balance >= item.cost
  RETURNING balance INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'Not enough credits for %', item.label;
  END IF;

  IF COALESCE(item.credit_payout, 0) > 0 THEN
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (_recipient, item.credit_payout)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_credits.balance + item.credit_payout,
          updated_at = now();
  END IF;

  INSERT INTO public.gifts (sender_id, recipient_id, room_id, gift_key, credits, note)
  VALUES (auth.uid(), _recipient, _room_id, item.key, item.cost, nullif(btrim(coalesce(_note, '')), ''));

  INSERT INTO public.notifications (user_id, actor_id, kind, room_id, emoji, preview)
  VALUES (_recipient, auth.uid(), 'gift', _room_id, item.emoji,
          left(item.label
               || CASE WHEN COALESCE(item.credit_payout, 0) > 0
                       THEN ' (+' || item.credit_payout || ' points)' ELSE '' END
               || coalesce(' — ' || nullif(btrim(coalesce(_note, '')), ''), ''), 160));

  RETURN remaining;
END;
$function$;