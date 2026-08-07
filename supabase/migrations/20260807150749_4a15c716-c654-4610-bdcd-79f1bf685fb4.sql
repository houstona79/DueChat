ALTER TABLE public.profile_updates
  ADD COLUMN hidden_at timestamptz,
  ADD COLUMN hidden_reason text;

CREATE TABLE public.moderation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  auto_hide_threshold integer NOT NULL DEFAULT 3 CHECK (auto_hide_threshold BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_settings TO authenticated;
GRANT ALL ON public.moderation_settings TO service_role;

ALTER TABLE public.moderation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read moderation settings" ON public.moderation_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can change moderation settings" ON public.moderation_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT UPDATE ON public.moderation_settings TO authenticated;

CREATE TRIGGER moderation_settings_set_updated_at
  BEFORE UPDATE ON public.moderation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.moderation_settings (id) VALUES (true);

DROP POLICY "Members can read profile updates" ON public.profile_updates;
CREATE POLICY "Members can read visible profile updates" ON public.profile_updates
  FOR SELECT USING (
    hidden_at IS NULL
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE OR REPLACE FUNCTION public.apply_report_auto_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  pending_count integer;
  threshold integer;
BEGIN
  target := COALESCE(NEW.update_id, OLD.update_id);
  SELECT auto_hide_threshold INTO threshold FROM public.moderation_settings WHERE id;
  threshold := COALESCE(threshold, 3);

  SELECT count(*) INTO pending_count
  FROM public.update_reports
  WHERE update_id = target AND status = 'pending';

  IF pending_count >= threshold THEN
    UPDATE public.profile_updates
    SET hidden_at = COALESCE(hidden_at, now()),
        hidden_reason = 'Automatically hidden after ' || pending_count || ' pending reports'
    WHERE id = target;
  ELSE
    UPDATE public.profile_updates
    SET hidden_at = NULL, hidden_reason = NULL
    WHERE id = target AND hidden_at IS NOT NULL;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_report_auto_hide() FROM anon, authenticated, PUBLIC;

CREATE TRIGGER update_reports_auto_hide
AFTER INSERT OR UPDATE OR DELETE ON public.update_reports
FOR EACH ROW EXECUTE FUNCTION public.apply_report_auto_hide();