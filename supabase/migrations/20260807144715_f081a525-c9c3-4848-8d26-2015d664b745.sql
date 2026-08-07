CREATE TABLE public.profile_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_updates TO authenticated;
GRANT ALL ON public.profile_updates TO service_role;

ALTER TABLE public.profile_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read profile updates"
ON public.profile_updates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can post their own updates"
ON public.profile_updates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_site_banned(auth.uid()));

CREATE POLICY "Users can edit their own updates"
ON public.profile_updates FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and staff can delete updates"
ON public.profile_updates FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE INDEX profile_updates_user_created_idx ON public.profile_updates (user_id, created_at DESC);

CREATE TRIGGER profile_updates_set_updated_at
BEFORE UPDATE ON public.profile_updates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_updates;