-- 1. Gift items get an optional name color
ALTER TABLE public.gift_items ADD COLUMN IF NOT EXISTS color_hex text;

-- 2. Profiles track when a gifted color expires
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_color_expires_at timestamptz;

-- 3. Guard: only the gift flow may set/extend an expiring color
CREATE OR REPLACE FUNCTION public.guard_name_color_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name_color_expires_at IS DISTINCT FROM OLD.name_color_expires_at
     AND COALESCE(current_setting('app.gift_color', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Timed name colors can only be set by a gift';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_name_color_expiry ON public.profiles;
CREATE TRIGGER profiles_guard_name_color_expiry
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_name_color_expiry();

-- 4. Red-name guard must allow gifted colors (maroon reads as red)
CREATE OR REPLACE FUNCTION public.reject_red_name_color()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r int; g int; b int;
BEGIN
  IF NEW.name_color IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(current_setting('app.gift_color', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  r := ('x' || substr(NEW.name_color, 2, 2))::bit(8)::int;
  g := ('x' || substr(NEW.name_color, 4, 2))::bit(8)::int;
  b := ('x' || substr(NEW.name_color, 6, 2))::bit(8)::int;
  IF r >= 120 AND r > g * 2 AND r > b * 2 THEN
    RAISE EXCEPTION 'Red name colors are reserved for admins';
  END IF;
  RETURN NEW;
END;
$$;

-- 5. The six color packs
INSERT INTO public.gift_items (key, label, emoji, cost, sort_order, credit_payout, color_hex)
VALUES
  ('color_maroon',           'Maroon name',           '🎨', 100, 200, 0, '#800000'),
  ('color_silver',           'Silver name',           '🎨', 100, 201, 0, '#c0c0c0'),
  ('color_dark_blue',        'Dark Blue name',        '🎨', 100, 202, 0, '#00008b'),
  ('color_hot_pink',         'Hot Pink name',         '🎨', 100, 203, 0, '#ff69b4'),
  ('color_midnight_violet',  'Midnight Violet name',  '🎨', 100, 204, 0, '#4b0082'),
  ('color_honeydew',         'Honeydew name',         '🎨', 100, 205, 0, '#c7f0c2')
ON CONFLICT (key) DO UPDATE
  SET label = excluded.label,
      emoji = excluded.emoji,
      cost = excluded.cost,
      sort_order = excluded.sort_order,
      credit_payout = excluded.credit_payout,
      color_hex = excluded.color_hex;

-- 6. gift_shelf exposes the color
DROP FUNCTION IF EXISTS public.gift_shelf(uuid);
CREATE OR REPLACE FUNCTION public.gift_shelf(_user_id uuid)
RETURNS TABLE(gift_key text, label text, emoji text, image_url text, color_hex text, total bigint, last_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT gi.key, gi.label, gi.emoji, gi.image_url, gi.color_hex, count(*)::bigint, max(g.created_at)
  FROM public.gifts g
  JOIN public.gift_items gi ON gi.key = g.gift_key
  WHERE g.recipient_id = _user_id
  GROUP BY gi.key, gi.label, gi.emoji, gi.image_url, gi.color_hex, gi.sort_order
  ORDER BY count(*) DESC, gi.sort_order ASC
  LIMIT 24
$$;

-- 7. send_gift applies timed colors
CREATE OR REPLACE FUNCTION public.send_gift(_recipient uuid, _gift_key text, _room_id uuid DEFAULT NULL::uuid, _note text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item public.gift_items;
  remaining integer;
  current_expiry timestamptz;
  new_expiry timestamptz;
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

  IF item.color_hex IS NOT NULL THEN
    SELECT name_color_expires_at INTO current_expiry FROM public.profiles WHERE id = _recipient;
    new_expiry := GREATEST(COALESCE(current_expiry, now()), now()) + interval '30 days';
    PERFORM set_config('app.gift_color', 'on', true);
    UPDATE public.profiles
    SET name_color = item.color_hex,
        name_color_expires_at = new_expiry
    WHERE id = _recipient;
    PERFORM set_config('app.gift_color', 'off', true);
  END IF;

  INSERT INTO public.gifts (sender_id, recipient_id, room_id, gift_key, credits, note)
  VALUES (auth.uid(), _recipient, _room_id, item.key, item.cost, nullif(btrim(coalesce(_note, '')), ''));

  INSERT INTO public.notifications (user_id, actor_id, kind, room_id, emoji, preview)
  VALUES (_recipient, auth.uid(), 'gift', _room_id, item.emoji,
          left(item.label
               || CASE WHEN COALESCE(item.credit_payout, 0) > 0
                       THEN ' (+' || item.credit_payout || ' points)' ELSE '' END
               || CASE WHEN item.color_hex IS NOT NULL
                       THEN ' (name color for 30 days)' ELSE '' END
               || coalesce(' — ' || nullif(btrim(coalesce(_note, '')), ''), ''), 160));

  RETURN remaining;
END;
$$;

-- 8. Expire colors hourly
CREATE OR REPLACE FUNCTION public.expire_name_colors()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleared integer;
BEGIN
  PERFORM set_config('app.gift_color', 'on', true);
  UPDATE public.profiles
  SET name_color = NULL, name_color_expires_at = NULL
  WHERE name_color_expires_at IS NOT NULL AND name_color_expires_at <= now();
  GET DIAGNOSTICS cleared = ROW_COUNT;
  PERFORM set_config('app.gift_color', 'off', true);
  RETURN cleared;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expire-name-colors')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-name-colors');

SELECT cron.schedule('expire-name-colors', '5 * * * *', $$SELECT public.expire_name_colors();$$);