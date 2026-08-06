ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_direct boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_key text;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_direct_key_idx ON public.rooms (direct_key) WHERE direct_key IS NOT NULL;

DROP POLICY IF EXISTS "Signed-in users can view rooms" ON public.rooms;

CREATE POLICY "Signed-in users can view group rooms"
ON public.rooms FOR SELECT TO authenticated
USING (is_direct = false OR public.is_room_member(id, auth.uid()) OR created_by = auth.uid());