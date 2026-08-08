ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS staff_only boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator')
$$;

CREATE OR REPLACE FUNCTION public.room_is_staff_only(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND staff_only)
$$;

DROP POLICY IF EXISTS "Signed-in users can view group rooms" ON public.rooms;
CREATE POLICY "Signed-in users can view group rooms"
ON public.rooms FOR SELECT
USING (
  (NOT staff_only OR public.is_staff(auth.uid()))
  AND (is_direct = false OR public.is_room_member(id, auth.uid()) OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.room_members;
CREATE POLICY "Users can join rooms themselves"
ON public.room_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_room_banned(room_id, auth.uid())
  AND NOT public.is_site_banned(auth.uid())
  AND (NOT public.room_requires_adult(room_id) OR public.is_adult(auth.uid()))
  AND (NOT public.room_is_staff_only(room_id) OR public.is_staff(auth.uid()))
);

INSERT INTO public.rooms (name, slug, topic, created_by, category, rating, staff_only)
SELECT 'Staff Room', 'staff-room', 'Private coordination for admins and moderators',
       '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid, 'Staff', 'G', true
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE slug = 'staff-room');