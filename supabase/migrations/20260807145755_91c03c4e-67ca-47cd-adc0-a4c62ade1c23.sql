CREATE TABLE public.profile_update_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id uuid NOT NULL REFERENCES public.profile_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (update_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.profile_update_reactions TO authenticated;
GRANT ALL ON public.profile_update_reactions TO service_role;

ALTER TABLE public.profile_update_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON public.profile_update_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.profile_update_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_site_banned(auth.uid()));

CREATE POLICY "Users can remove their own reactions"
  ON public.profile_update_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authors and staff can remove reactions"
  ON public.profile_update_reactions FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.profile_updates pu
      WHERE pu.id = profile_update_reactions.update_id AND pu.user_id = auth.uid()
    )
  );

CREATE INDEX profile_update_reactions_update_id_idx ON public.profile_update_reactions(update_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_update_reactions;