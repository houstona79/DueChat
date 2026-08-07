DROP POLICY IF EXISTS "Members can read visible profile updates" ON public.profile_updates;
CREATE POLICY "Members can read visible profile updates"
ON public.profile_updates FOR SELECT TO authenticated
USING (hidden_at IS NULL OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));