CREATE TABLE public.room_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_ratings TO authenticated;
GRANT ALL ON public.room_ratings TO service_role;

ALTER TABLE public.room_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read room ratings" ON public.room_ratings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members rate rooms" ON public.room_ratings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT public.is_site_banned(auth.uid()));

CREATE POLICY "Members change their rating" ON public.room_ratings
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members remove their rating, staff can moderate" ON public.room_ratings
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()) OR public.is_room_super_admin(room_id, auth.uid()));

CREATE TRIGGER room_ratings_set_updated_at
BEFORE UPDATE ON public.room_ratings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.public_room_profile(_slug text)
RETURNS TABLE(
  id uuid, name text, slug text, topic text, status_message text, category text,
  rating text, name_color text, icon_url text, banner_url text,
  website_url text, website_label text, created_at timestamptz,
  member_count bigint, rating_avg numeric, rating_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.slug, r.topic, r.status_message, r.category,
         r.rating, r.name_color, r.icon_url, r.banner_url,
         r.website_url, r.website_label, r.created_at,
         (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id),
         (SELECT round(avg(rr.stars), 2) FROM public.room_ratings rr WHERE rr.room_id = r.id),
         (SELECT count(*) FROM public.room_ratings rr WHERE rr.room_id = r.id)
  FROM public.rooms r
  WHERE lower(r.slug) = lower(_slug)
    AND NOT r.is_direct
    AND NOT r.invisible
    AND NOT r.staff_only
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.public_room_staff(_slug text)
RETURNS TABLE(
  user_id uuid, tier text, username text, display_name text,
  avatar_url text, name_color text, country text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH room AS (
    SELECT r.id, r.created_by
    FROM public.rooms r
    WHERE lower(r.slug) = lower(_slug)
      AND NOT r.is_direct AND NOT r.invisible AND NOT r.staff_only
    LIMIT 1
  ), staff AS (
    SELECT room.created_by AS user_id, 'owner'::text AS tier, 0 AS sort FROM room
    UNION
    SELECT ra.user_id, ra.tier::text,
           CASE WHEN ra.tier = 'super' THEN 1 ELSE 2 END
    FROM public.room_admins ra
    JOIN room ON room.id = ra.room_id
    WHERE ra.user_id <> room.created_by
  )
  SELECT s.user_id, s.tier, p.username, p.display_name, p.avatar_url, p.name_color, p.country
  FROM staff s
  JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.sort ASC, p.display_name ASC
$$;

CREATE OR REPLACE FUNCTION public.public_room_reviews(_slug text, _limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, stars smallint, comment text, created_at timestamptz,
  username text, display_name text, avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rr.id, rr.stars, rr.comment, rr.created_at,
         p.username, p.display_name, p.avatar_url
  FROM public.room_ratings rr
  JOIN public.rooms r ON r.id = rr.room_id
   AND lower(r.slug) = lower(_slug)
   AND NOT r.is_direct AND NOT r.invisible AND NOT r.staff_only
  JOIN public.profiles p ON p.id = rr.user_id
  ORDER BY rr.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 20), 100)
$$;

CREATE OR REPLACE FUNCTION public.list_public_rooms(_limit integer DEFAULT 60)
RETURNS TABLE(
  id uuid, name text, slug text, topic text, category text, rating text,
  name_color text, icon_url text, member_count bigint,
  rating_avg numeric, rating_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.slug, r.topic, r.category, r.rating, r.name_color, r.icon_url,
         (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id),
         (SELECT round(avg(rr.stars), 2) FROM public.room_ratings rr WHERE rr.room_id = r.id),
         (SELECT count(*) FROM public.room_ratings rr WHERE rr.room_id = r.id)
  FROM public.rooms r
  WHERE NOT r.is_direct AND NOT r.invisible AND NOT r.staff_only
  ORDER BY r.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 60), 200)
$$;

GRANT EXECUTE ON FUNCTION public.public_room_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_room_staff(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_room_reviews(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_rooms(integer) TO anon, authenticated;