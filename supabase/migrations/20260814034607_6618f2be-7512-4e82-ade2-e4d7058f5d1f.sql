CREATE TABLE public.karaoke_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  youtube_url text NOT NULL,
  singer_name text,
  played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX karaoke_queue_room_idx ON public.karaoke_queue (room_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.karaoke_queue TO authenticated;
GRANT ALL ON public.karaoke_queue TO service_role;

ALTER TABLE public.karaoke_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read the karaoke queue" ON public.karaoke_queue
FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()) OR public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Members can request karaoke songs" ON public.karaoke_queue
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_room_member(room_id, auth.uid())
  AND NOT public.is_room_banned(room_id, auth.uid())
);

CREATE POLICY "Requester or room staff can update karaoke songs" ON public.karaoke_queue
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()) OR public.is_room_admin(room_id, auth.uid()) OR public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()) OR public.is_room_admin(room_id, auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Requester or room staff can remove karaoke songs" ON public.karaoke_queue
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()) OR public.is_room_admin(room_id, auth.uid()) OR public.is_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_queue;

INSERT INTO public.rooms (name, slug, topic, created_by, category, rating)
SELECT 'Karaoke Lounge', 'karaoke-lounge', 'Grab the mic — queue up a YouTube karaoke track and sing',
       '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid, 'Karaoke', 'G'
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE slug = 'karaoke-lounge');