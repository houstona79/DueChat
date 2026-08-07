CREATE TABLE public.active_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can register their own sessions"
ON public.active_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can refresh their own sessions"
ON public.active_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own sessions"
ON public.active_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
ON public.active_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.active_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can view all sessions"
ON public.active_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins can clear sessions"
ON public.active_sessions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER active_sessions_set_updated_at
BEFORE UPDATE ON public.active_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX active_sessions_user_updated_idx ON public.active_sessions (user_id, updated_at DESC);