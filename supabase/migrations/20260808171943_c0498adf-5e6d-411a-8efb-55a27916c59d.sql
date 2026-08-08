CREATE TABLE public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, invitee_id)
);

GRANT SELECT, INSERT, DELETE ON public.room_invites TO authenticated;
GRANT ALL ON public.room_invites TO service_role;

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites are visible to sender and recipient"
ON public.room_invites FOR SELECT TO authenticated
USING (
  invitee_id = auth.uid()
  OR inviter_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Members can invite others to their rooms"
ON public.room_invites FOR INSERT TO authenticated
WITH CHECK (
  inviter_id = auth.uid()
  AND invitee_id <> auth.uid()
  AND public.is_room_member(room_id, auth.uid())
  AND NOT public.is_room_banned(room_id, invitee_id)
  AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.is_direct)
);

CREATE POLICY "Sender or recipient can remove an invite"
ON public.room_invites FOR DELETE TO authenticated
USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE INDEX room_invites_invitee_idx ON public.room_invites (invitee_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;