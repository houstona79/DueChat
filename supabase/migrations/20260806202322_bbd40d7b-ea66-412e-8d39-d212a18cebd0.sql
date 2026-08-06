CREATE TABLE public.site_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.site_bans TO authenticated;
GRANT ALL ON public.site_bans TO service_role;

ALTER TABLE public.site_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view site bans" ON public.site_bans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can ban users" ON public.site_bans
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND auth.uid() = banned_by
    AND user_id <> '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid
    AND NOT public.has_role(user_id, 'admin')
  );

CREATE POLICY "Admins can unban users" ON public.site_bans
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_site_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.site_bans WHERE user_id = _user_id)
$$;

-- Banned members lose the ability to post, join, or create rooms
DROP POLICY "Members can post messages" ON public.messages;
CREATE POLICY "Members can post messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_room_member(room_id, auth.uid())
    AND NOT public.is_site_banned(auth.uid())
  );

DROP POLICY "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_room_banned(room_id, auth.uid())
    AND NOT public.is_site_banned(auth.uid())
  );

DROP POLICY "Signed-in users can create rooms" ON public.rooms;
CREATE POLICY "Signed-in users can create rooms" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND NOT public.is_site_banned(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_bans;