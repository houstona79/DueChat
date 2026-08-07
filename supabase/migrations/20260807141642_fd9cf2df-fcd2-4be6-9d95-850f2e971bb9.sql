CREATE POLICY "Moderators can clear member sessions"
ON public.active_sessions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role)
  AND user_id <> '9ab27da1-753c-4fba-bf47-6932ab7de55c'::uuid
  AND NOT has_role(user_id, 'admin'::app_role)
  AND NOT has_role(user_id, 'moderator'::app_role)
);