CREATE TABLE public.profile_update_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.profile_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_update_comments TO authenticated;
GRANT ALL ON public.profile_update_comments TO service_role;

ALTER TABLE public.profile_update_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read update comments"
ON public.profile_update_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profile_updates pu
    WHERE pu.id = update_id
      AND (pu.hidden_at IS NULL
           OR pu.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'moderator'))
  )
);

CREATE POLICY "Users can add their own comments"
ON public.profile_update_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_site_banned(auth.uid()));

CREATE POLICY "Users can edit their own comments"
ON public.profile_update_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors owners and staff can delete comments"
ON public.profile_update_comments FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profile_updates pu WHERE pu.id = update_id AND pu.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE INDEX profile_update_comments_update_idx ON public.profile_update_comments (update_id, created_at);

CREATE TRIGGER profile_update_comments_set_updated_at
BEFORE UPDATE ON public.profile_update_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_update_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.profile_updates WHERE id = NEW.update_id;
  IF owner IS NULL OR owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, kind, update_id, preview)
  VALUES (owner, NEW.user_id, 'comment', NEW.update_id, left(NEW.body, 120));
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_update_comments_notify
AFTER INSERT ON public.profile_update_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_update_comment();