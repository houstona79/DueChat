CREATE TABLE public.room_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  media_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_posts TO authenticated;
GRANT ALL ON public.room_posts TO service_role;

ALTER TABLE public.room_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read room posts"
ON public.room_posts FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Members can post to room feed"
ON public.room_posts FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_room_member(room_id, auth.uid())
  AND NOT public.is_room_banned(room_id, auth.uid())
  AND NOT public.is_site_banned(auth.uid())
  AND (NOT public.room_requires_adult(room_id) OR public.is_adult(auth.uid()))
);

CREATE POLICY "Authors can edit their room posts"
ON public.room_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and moderators can delete room posts"
ON public.room_posts FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_room_admin(room_id, auth.uid())
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE INDEX room_posts_room_created_idx ON public.room_posts (room_id, created_at DESC);

CREATE TRIGGER room_posts_set_updated_at
BEFORE UPDATE ON public.room_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.room_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.room_post_likes TO authenticated;
GRANT ALL ON public.room_post_likes TO service_role;

ALTER TABLE public.room_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read post likes"
ON public.room_post_likes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.room_posts p
  WHERE p.id = post_id AND (public.is_room_member(p.room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
));

CREATE POLICY "Members can like posts"
ON public.room_post_likes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.room_posts p
    WHERE p.id = post_id
      AND public.is_room_member(p.room_id, auth.uid())
      AND NOT public.is_room_banned(p.room_id, auth.uid())
  )
);

CREATE POLICY "Users can remove their own like"
ON public.room_post_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX room_post_likes_post_idx ON public.room_post_likes (post_id);

CREATE TABLE public.room_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_post_comments TO authenticated;
GRANT ALL ON public.room_post_comments TO service_role;

ALTER TABLE public.room_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read post comments"
ON public.room_post_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.room_posts p
  WHERE p.id = post_id AND (public.is_room_member(p.room_id, auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
));

CREATE POLICY "Members can comment on posts"
ON public.room_post_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_site_banned(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.room_posts p
    WHERE p.id = post_id
      AND public.is_room_member(p.room_id, auth.uid())
      AND NOT public.is_room_banned(p.room_id, auth.uid())
  )
);

CREATE POLICY "Authors can edit their comments"
ON public.room_post_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and moderators can delete comments"
ON public.room_post_comments FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.room_posts p
    WHERE p.id = post_id AND public.is_room_admin(p.room_id, auth.uid())
  )
);

CREATE INDEX room_post_comments_post_idx ON public.room_post_comments (post_id, created_at);

CREATE TRIGGER room_post_comments_set_updated_at
BEFORE UPDATE ON public.room_post_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_post_comments;