CREATE TABLE public.room_wallpapers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  wallpaper_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, room_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_wallpapers TO authenticated;
GRANT ALL ON public.room_wallpapers TO service_role;

ALTER TABLE public.room_wallpapers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own room wallpapers"
ON public.room_wallpapers FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);