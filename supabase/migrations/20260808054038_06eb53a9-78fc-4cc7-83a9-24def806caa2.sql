ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS trivia_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.trivia_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  choices text[] NOT NULL DEFAULT '{}',
  started_by uuid NOT NULL REFERENCES auth.users(id),
  winner_id uuid REFERENCES auth.users(id),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trivia_rounds_room_created_idx ON public.trivia_rounds (room_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.trivia_rounds TO authenticated;
GRANT ALL ON public.trivia_rounds TO service_role;

ALTER TABLE public.trivia_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read trivia rounds"
ON public.trivia_rounds FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Room members can start trivia rounds"
ON public.trivia_rounds FOR INSERT TO authenticated
WITH CHECK (
  started_by = auth.uid()
  AND public.is_room_member(room_id, auth.uid())
  AND NOT public.is_room_banned(room_id, auth.uid())
  AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.trivia_enabled)
);

CREATE POLICY "Room members can answer trivia rounds"
ON public.trivia_rounds FOR UPDATE TO authenticated
USING (public.is_room_member(room_id, auth.uid()) AND NOT public.is_room_banned(room_id, auth.uid()))
WITH CHECK (public.is_room_member(room_id, auth.uid()));

CREATE TRIGGER trivia_rounds_set_updated_at
BEFORE UPDATE ON public.trivia_rounds
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.trivia_rounds;