-- Room-level admins
CREATE TABLE public.room_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.room_admins TO authenticated;
GRANT ALL ON public.room_admins TO service_role;
ALTER TABLE public.room_admins ENABLE ROW LEVEL SECURITY;

-- Room bans
CREATE TABLE public.room_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.room_bans TO authenticated;
GRANT ALL ON public.room_bans TO service_role;
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND created_by = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_room_owner(_room_id, _user_id)
     OR EXISTS (SELECT 1 FROM public.room_admins WHERE room_id = _room_id AND user_id = _user_id)
     OR public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_room_banned(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_bans WHERE room_id = _room_id AND user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION public.is_room_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_banned(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_banned(uuid, uuid) TO authenticated;

-- room_admins policies
CREATE POLICY "Members can view room admins" ON public.room_admins
  FOR SELECT TO authenticated USING (public.is_room_member(room_id, auth.uid()) OR public.is_room_owner(room_id, auth.uid()));
CREATE POLICY "Room owners can add room admins" ON public.room_admins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = granted_by AND (public.is_room_owner(room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Room owners can remove room admins" ON public.room_admins
  FOR DELETE TO authenticated USING (public.is_room_owner(room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- room_bans policies
CREATE POLICY "Members can view room bans" ON public.room_bans
  FOR SELECT TO authenticated USING (public.is_room_member(room_id, auth.uid()) OR public.is_room_owner(room_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Room admins can ban" ON public.room_bans
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = banned_by
    AND public.is_room_admin(room_id, auth.uid())
    AND NOT public.is_room_owner(room_id, user_id)
  );
CREATE POLICY "Room admins can unban" ON public.room_bans
  FOR DELETE TO authenticated USING (public.is_room_admin(room_id, auth.uid()));

-- Kicks: room admins may remove other members
CREATE POLICY "Room admins can remove members" ON public.room_members
  FOR DELETE TO authenticated USING (
    public.is_room_admin(room_id, auth.uid())
    AND NOT public.is_room_owner(room_id, user_id)
  );

-- Banned users cannot (re)join
DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves" ON public.room_members
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND NOT public.is_room_banned(room_id, auth.uid())
  );

-- Room admins can moderate messages in their rooms
CREATE POLICY "Room admins can delete room messages" ON public.messages
  FOR DELETE TO authenticated USING (public.is_room_admin(room_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_admins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_bans;