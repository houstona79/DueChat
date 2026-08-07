ALTER TABLE public.user_ip_log
  ADD COLUMN is_vpn boolean NOT NULL DEFAULT false,
  ADD COLUMN network text,
  ADD COLUMN checked_at timestamptz;