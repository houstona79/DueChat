-- 1. Room admin tiers
ALTER TABLE public.room_admins
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'admin';
ALTER TABLE public.room_admins
  ADD CONSTRAINT room_admins_tier_check CHECK (tier IN ('super', 'admin'));

CREATE OR REPLACE FUNCTION public.is_room_super_admin(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_room_owner(_room_id, _user_id)
     OR EXISTS (
       SELECT 1 FROM public.room_admins
       WHERE room_id = _room_id AND user_id = _user_id AND tier = 'super'
     )
     OR public.has_role(_user_id, 'admin')
$$;

DROP POLICY IF EXISTS "Room owners can add room admins" ON public.room_admins;
DROP POLICY IF EXISTS "Room owners can remove room admins" ON public.room_admins;
CREATE POLICY "Room super admins can add room admins"
  ON public.room_admins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = granted_by AND public.is_room_super_admin(room_id, auth.uid()));
CREATE POLICY "Room super admins can remove room admins"
  ON public.room_admins FOR DELETE TO authenticated
  USING (public.is_room_super_admin(room_id, auth.uid()));
CREATE POLICY "Room super admins can change admin tier"
  ON public.room_admins FOR UPDATE TO authenticated
  USING (public.is_room_super_admin(room_id, auth.uid()))
  WITH CHECK (public.is_room_super_admin(room_id, auth.uid()));

-- 2. Room status message, editable by owners, super admins and site admins
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS status_message text;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_status_message_len
  CHECK (status_message IS NULL OR char_length(status_message) <= 200);

CREATE POLICY "Room super admins can update rooms"
  ON public.rooms FOR UPDATE TO authenticated
  USING (public.is_room_super_admin(id, auth.uid()))
  WITH CHECK (public.is_room_super_admin(id, auth.uid()));

-- 3. Timed room bans / restriction list
ALTER TABLE public.room_bans ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_room_banned(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_bans
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 4. Silences ("dotted") — can read the room but cannot post
CREATE TABLE public.room_silences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  silenced_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_silences TO authenticated;
GRANT ALL ON public.room_silences TO service_role;
ALTER TABLE public.room_silences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view room silences"
  ON public.room_silences FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid())
    OR public.is_room_owner(room_id, auth.uid())
    OR user_id = auth.uid()
    OR public.is_staff(auth.uid())
  );
CREATE POLICY "Room admins can silence"
  ON public.room_silences FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = silenced_by
    AND public.is_room_admin(room_id, auth.uid())
    AND NOT public.is_room_owner(room_id, user_id)
  );
CREATE POLICY "Room admins can update silences"
  ON public.room_silences FOR UPDATE TO authenticated
  USING (public.is_room_admin(room_id, auth.uid()))
  WITH CHECK (public.is_room_admin(room_id, auth.uid()));
CREATE POLICY "Room admins can lift silences"
  ON public.room_silences FOR DELETE TO authenticated
  USING (public.is_room_admin(room_id, auth.uid()));

CREATE TRIGGER room_silences_set_updated_at
  BEFORE UPDATE ON public.room_silences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_room_silenced(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_silences
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

DROP POLICY IF EXISTS "Members can post messages" ON public.messages;
CREATE POLICY "Members can post messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_room_member(room_id, auth.uid())
    AND NOT public.is_site_banned(auth.uid())
    AND NOT public.is_room_silenced(room_id, auth.uid())
    AND (NOT public.room_requires_adult(room_id) OR public.is_adult(auth.uid()))
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_silences;

-- 5. Bounce events in the room timeline
ALTER TABLE public.room_events DROP CONSTRAINT IF EXISTS room_events_kind_check;
ALTER TABLE public.room_events
  ADD CONSTRAINT room_events_kind_check CHECK (kind IN ('join', 'leave', 'bounce'));

-- 6. Personal block list
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own block list"
  ON public.user_blocks FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Staff can view block lists"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;

-- 7. Profile visibility and name decoration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS decoration text;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_visibility_check
  CHECK (profile_visibility IN ('public', 'buddies', 'private'));
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_decoration_check
  CHECK (decoration IS NULL OR decoration IN (
    'diamond', 'star', 'crown', 'heart', 'sparkles', 'fire', 'rainbow', 'rocket',
    'shield', 'flower', 'music', 'clover'
  ));