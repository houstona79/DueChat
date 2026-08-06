CREATE POLICY "Participants can add each other to direct rooms"
ON public.room_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND r.is_direct = true
      AND r.direct_key IS NOT NULL
      AND auth.uid()::text = ANY (string_to_array(r.direct_key, ':'))
      AND room_members.user_id::text = ANY (string_to_array(r.direct_key, ':'))
  )
);