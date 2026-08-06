CREATE POLICY "Moderators can view all messages" ON public.messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can delete member messages" ON public.messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') AND NOT public.has_role(user_id, 'admin'));

CREATE POLICY "Moderators can view all rooms" ON public.rooms
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can ban members" ON public.site_bans
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator')
    AND auth.uid() = banned_by
    AND user_id <> '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid
    AND NOT public.has_role(user_id, 'admin')
    AND NOT public.has_role(user_id, 'moderator')
  );

CREATE POLICY "Moderators can undo their own bans" ON public.site_bans
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') AND banned_by = auth.uid());