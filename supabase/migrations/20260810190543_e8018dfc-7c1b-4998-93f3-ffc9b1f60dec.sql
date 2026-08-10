-- ========== 1. invisible + locked rooms ==========
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS invisible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.room_locks (
  room_id uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
-- Codes are never readable by clients: no grants to anon/authenticated.
GRANT ALL ON public.room_locks TO service_role;
ALTER TABLE public.room_locks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER room_locks_set_updated_at
  BEFORE UPDATE ON public.room_locks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.room_is_locked(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND locked)
$$;

CREATE OR REPLACE FUNCTION public.room_is_invisible(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND invisible)
$$;

-- Hidden rooms drop out of the listing for everyone except owner/members/invitees.
DROP POLICY IF EXISTS "Signed-in users can view group rooms" ON public.rooms;
CREATE POLICY "Signed-in users can view group rooms"
ON public.rooms FOR SELECT
USING (
  ((NOT staff_only) OR public.is_staff(auth.uid()))
  AND ((is_direct = false) OR public.is_room_member(id, auth.uid()) OR created_by = auth.uid())
  AND (
    (NOT invisible)
    OR created_by = auth.uid()
    OR public.is_room_member(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.room_invites ri
      WHERE ri.room_id = rooms.id AND ri.invitee_id = auth.uid()
    )
  )
);

-- Locked rooms can only be joined through unlock_room() (or by owner/staff).
DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves"
ON public.room_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (NOT public.is_room_banned(room_id, auth.uid()))
  AND (NOT public.is_site_banned(auth.uid()))
  AND ((NOT public.room_requires_adult(room_id)) OR public.is_adult(auth.uid()))
  AND ((NOT public.room_is_staff_only(room_id)) OR public.is_staff(auth.uid()))
  AND ((NOT public.room_is_locked(room_id)) OR public.is_room_admin(room_id, auth.uid()) OR public.is_staff(auth.uid()))
);

-- Owner / room super admin / site admin sets or clears the entry code.
CREATE OR REPLACE FUNCTION public.set_room_lock(_room_id uuid, _code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean text;
BEGIN
  IF NOT public.is_room_super_admin(_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the room owner can change the entry code';
  END IF;
  clean := nullif(btrim(coalesce(_code, '')), '');
  IF clean IS NULL THEN
    DELETE FROM public.room_locks WHERE room_id = _room_id;
    UPDATE public.rooms SET locked = false WHERE id = _room_id;
    RETURN;
  END IF;
  IF length(clean) < 3 OR length(clean) > 24 THEN
    RAISE EXCEPTION 'The entry code must be 3 to 24 characters';
  END IF;
  INSERT INTO public.room_locks (room_id, code) VALUES (_room_id, clean)
  ON CONFLICT (room_id) DO UPDATE SET code = excluded.code, updated_at = now();
  UPDATE public.rooms SET locked = true WHERE id = _room_id;
END;
$$;

-- Checks the code and joins the caller. Owner and staff never need the code.
CREATE OR REPLACE FUNCTION public.unlock_room(_room_id uuid, _code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expected text;
  bypass boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF public.is_site_banned(auth.uid()) OR public.is_room_banned(_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'You cannot enter this room';
  END IF;
  IF public.room_requires_adult(_room_id) AND NOT public.is_adult(auth.uid()) THEN
    RAISE EXCEPTION 'This room is for adults only';
  END IF;

  bypass := public.is_room_admin(_room_id, auth.uid()) OR public.is_staff(auth.uid());
  SELECT code INTO expected FROM public.room_locks WHERE room_id = _room_id;

  IF NOT bypass AND expected IS NOT NULL
     AND lower(btrim(coalesce(_code, ''))) <> lower(expected) THEN
    RETURN false;
  END IF;

  INSERT INTO public.room_members (room_id, user_id) VALUES (_room_id, auth.uid())
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN true;
END;
$$;

-- ========== 2. credits and gifts ==========
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  last_grant_on date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all credits"
ON public.user_credits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER user_credits_set_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.gift_items (
  key text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL,
  cost integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_items TO authenticated;
GRANT ALL ON public.gift_items TO service_role;
ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view gifts"
ON public.gift_items FOR SELECT TO authenticated USING (true);

INSERT INTO public.gift_items (key, label, emoji, cost, sort_order) VALUES
  ('rose', 'Rose', '🌹', 5, 1),
  ('coffee', 'Coffee', '☕', 8, 2),
  ('cake', 'Cake', '🍰', 12, 3),
  ('star', 'Star', '⭐', 15, 4),
  ('trophy', 'Trophy', '🏆', 25, 5),
  ('rocket', 'Rocket', '🚀', 35, 6),
  ('crown', 'Crown', '👑', 50, 7),
  ('diamond', 'Diamond', '💎', 100, 8)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  gift_key text NOT NULL REFERENCES public.gift_items(key),
  credits integer NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gifts_recipient_idx ON public.gifts (recipient_id, created_at DESC);
GRANT SELECT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can view gifts they sent or received"
ON public.gifts FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.is_staff(auth.uid()));

-- Free daily allowance: 25 credits per calendar day.
CREATE OR REPLACE FUNCTION public.claim_daily_credits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_credits public.user_credits;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  INSERT INTO public.user_credits (user_id, balance, last_grant_on)
  VALUES (auth.uid(), 25, current_date)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance
      + CASE WHEN public.user_credits.last_grant_on IS DISTINCT FROM current_date THEN 25 ELSE 0 END,
        last_grant_on = current_date,
        updated_at = now()
  RETURNING * INTO row_credits;
  RETURN row_credits.balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_gift(_recipient uuid, _gift_key text, _room_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.gifts (sender_id, recipient_id, room_id, gift_key, credits, note)
  VALUES (auth.uid(), _recipient, _room_id, item.key, item.cost, nullif(btrim(coalesce(_note, '')), ''));

  INSERT INTO public.notifications (user_id, actor_id, kind, room_id, emoji, preview)
  VALUES (_recipient, auth.uid(), 'gift', _room_id, item.emoji,
          left(item.label || coalesce(' — ' || nullif(btrim(coalesce(_note, '')), ''), ''), 160));

  RETURN remaining;
END;
$$;

-- ========== 3. raise hand / mic queue ==========
CREATE TABLE IF NOT EXISTS public.room_hands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raised_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_at timestamp with time zone,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_hands TO authenticated;
GRANT ALL ON public.room_hands TO service_role;
ALTER TABLE public.room_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view hands in their rooms"
ON public.room_hands FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Members can raise their own hand"
ON public.room_hands FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_room_member(room_id, auth.uid())
  AND granted_at IS NULL
  AND granted_by IS NULL
);

CREATE POLICY "Members can lower their own hand"
ON public.room_hands FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_room_admin(room_id, auth.uid()));

CREATE POLICY "Room admins can grant the microphone"
ON public.room_hands FOR UPDATE TO authenticated
USING (public.is_room_admin(room_id, auth.uid()))
WITH CHECK (public.is_room_admin(room_id, auth.uid()));

CREATE TRIGGER room_hands_set_updated_at
  BEFORE UPDATE ON public.room_hands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_hands;