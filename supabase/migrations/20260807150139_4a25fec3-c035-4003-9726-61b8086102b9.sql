CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed');

CREATE TABLE public.update_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id uuid NOT NULL REFERENCES public.profile_updates(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 60),
  details text CHECK (details IS NULL OR char_length(details) <= 500),
  status public.report_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (update_id, reporter_id)
);

GRANT SELECT, INSERT, UPDATE ON public.update_reports TO authenticated;
GRANT ALL ON public.update_reports TO service_role;

ALTER TABLE public.update_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view their own reports"
  ON public.update_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Staff can view all reports"
  ON public.update_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can file their own reports"
  ON public.update_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND NOT public.is_site_banned(auth.uid()));

CREATE POLICY "Staff can resolve reports"
  ON public.update_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX update_reports_status_idx ON public.update_reports(status, created_at DESC);

CREATE TRIGGER update_reports_set_updated_at
  BEFORE UPDATE ON public.update_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.update_reports;