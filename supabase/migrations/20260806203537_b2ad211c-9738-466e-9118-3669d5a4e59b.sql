CREATE TABLE public.session_kicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kicked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.session_kicks TO authenticated;
GRANT ALL ON public.session_kicks TO service_role;

ALTER TABLE public.session_kicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view kicks"
  ON public.session_kicks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can kick users"
  ON public.session_kicks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND auth.uid() = kicked_by
    AND user_id <> '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid
  );

CREATE POLICY "Moderators can kick members"
  ON public.session_kicks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator')
    AND auth.uid() = kicked_by
    AND user_id <> '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid
    AND NOT public.has_role(user_id, 'admin')
  );

CREATE POLICY "Admins can clear kicks"
  ON public.session_kicks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX session_kicks_user_created_idx ON public.session_kicks (user_id, created_at DESC);

ALTER TABLE public.session_kicks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_kicks;