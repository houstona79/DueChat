ALTER TABLE public.profile_updates
  ADD COLUMN pinned_at timestamp with time zone;

CREATE INDEX profile_updates_user_pinned_idx
  ON public.profile_updates(user_id, pinned_at DESC NULLS LAST, created_at DESC);