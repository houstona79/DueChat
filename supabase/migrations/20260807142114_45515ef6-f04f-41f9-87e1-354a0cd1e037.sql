CREATE TABLE public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_photos_user_idx ON public.profile_photos (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_photos TO authenticated;
GRANT ALL ON public.profile_photos TO service_role;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view profile photos" ON public.profile_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add their own photos" ON public.profile_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own photos" ON public.profile_photos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.profile_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can delete any profile photo" ON public.profile_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE TRIGGER profile_photos_set_updated_at BEFORE UPDATE ON public.profile_photos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();