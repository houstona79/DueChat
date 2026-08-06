ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS radio_url text,
  ADD COLUMN IF NOT EXISTS radio_name text;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_radio_url_format
  CHECK (radio_url IS NULL OR radio_url ~* '^https://[^\s]+$');

DROP POLICY IF EXISTS "Admins can update any room" ON public.rooms;
CREATE POLICY "Admins can update any room"
ON public.rooms FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));