CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  body text NOT NULL,
  excerpt text,
  cover_url text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT SELECT ON public.blog_posts TO anon;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blogs are readable by everyone"
  ON public.blog_posts FOR SELECT
  USING (published_at IS NOT NULL);
CREATE POLICY "Authors can read their own blogs"
  ON public.blog_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Authors can write their own blogs"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can edit their own blogs"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors and staff can delete blogs"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX blog_posts_published_idx ON public.blog_posts (published_at DESC NULLS LAST);

CREATE TABLE public.blog_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT SELECT ON public.blog_comments TO anon;
GRANT ALL ON public.blog_comments TO service_role;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments on published blogs are readable"
  ON public.blog_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.published_at IS NOT NULL));
CREATE POLICY "Members can comment on published blogs"
  ON public.blog_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.published_at IS NOT NULL)
  );
CREATE POLICY "Members can edit their own blog comments"
  ON public.blog_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Commenter, author or staff can delete blog comments"
  ON public.blog_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER blog_comments_set_updated_at BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blog_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.blog_likes TO authenticated;
GRANT SELECT ON public.blog_likes TO anon;
GRANT ALL ON public.blog_likes TO service_role;
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes on published blogs are readable"
  ON public.blog_likes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.published_at IS NOT NULL));
CREATE POLICY "Members can like published blogs"
  ON public.blog_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.blog_posts p WHERE p.id = post_id AND p.published_at IS NOT NULL)
  );
CREATE POLICY "Members can remove their own likes"
  ON public.blog_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.list_published_blogs(_username text DEFAULT NULL, _limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid, user_id uuid, title text, slug text, excerpt text, cover_url text,
  published_at timestamptz, author_username text, author_display_name text,
  author_avatar_url text, like_count bigint, comment_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.title, p.slug, p.excerpt, p.cover_url, p.published_at,
         pr.username, pr.display_name, pr.avatar_url,
         (SELECT count(*) FROM public.blog_likes l WHERE l.post_id = p.id),
         (SELECT count(*) FROM public.blog_comments c WHERE c.post_id = p.id)
  FROM public.blog_posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.published_at IS NOT NULL
    AND (_username IS NULL OR lower(pr.username) = lower(_username))
  ORDER BY p.published_at DESC
  LIMIT LEAST(COALESCE(_limit, 30), 100)
$$;

GRANT EXECUTE ON FUNCTION public.list_published_blogs(text, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_published_blog(_username text, _slug text)
RETURNS TABLE (
  id uuid, user_id uuid, title text, slug text, body text, excerpt text, cover_url text,
  published_at timestamptz, author_username text, author_display_name text,
  author_avatar_url text, like_count bigint, comment_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.title, p.slug, p.body, p.excerpt, p.cover_url, p.published_at,
         pr.username, pr.display_name, pr.avatar_url,
         (SELECT count(*) FROM public.blog_likes l WHERE l.post_id = p.id),
         (SELECT count(*) FROM public.blog_comments c WHERE c.post_id = p.id)
  FROM public.blog_posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.published_at IS NOT NULL
    AND lower(pr.username) = lower(_username)
    AND p.slug = _slug
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_published_blog(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.blog_comment_feed(_post_id uuid)
RETURNS TABLE (
  id uuid, post_id uuid, user_id uuid, body text, created_at timestamptz,
  author_username text, author_display_name text, author_avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.post_id, c.user_id, c.body, c.created_at,
         pr.username, pr.display_name, pr.avatar_url
  FROM public.blog_comments c
  JOIN public.blog_posts p ON p.id = c.post_id AND p.published_at IS NOT NULL
  JOIN public.profiles pr ON pr.id = c.user_id
  WHERE c.post_id = _post_id
  ORDER BY c.created_at ASC
  LIMIT 200
$$;

GRANT EXECUTE ON FUNCTION public.blog_comment_feed(uuid) TO anon, authenticated, service_role;