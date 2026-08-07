CREATE TABLE public.user_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text NOT NULL,
  device_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip)
);

GRANT SELECT ON public.user_ip_log TO authenticated;
GRANT ALL ON public.user_ip_log TO service_role;

ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read the IP log"
ON public.user_ip_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_ip_log_set_updated_at
BEFORE UPDATE ON public.user_ip_log
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX user_ip_log_user_idx ON public.user_ip_log (user_id, updated_at DESC);