CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  update_id uuid REFERENCES public.profile_updates(id) ON DELETE CASCADE,
  emoji text,
  preview text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_update_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
  txt text;
BEGIN
  SELECT user_id, body INTO owner, txt FROM public.profile_updates WHERE id = NEW.update_id;
  IF owner IS NULL OR owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, kind, update_id, emoji, preview)
  VALUES (owner, NEW.user_id, 'reaction', NEW.update_id, NEW.emoji, left(txt, 120));
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_update_reactions_notify
AFTER INSERT ON public.profile_update_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_update_reaction();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;