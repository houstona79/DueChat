ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description text;

DROP FUNCTION IF EXISTS public.list_public_rooms(integer);

CREATE OR REPLACE FUNCTION public.list_public_rooms(_limit integer)
RETURNS TABLE(id uuid, name text, slug text, topic text, description text, category text, rating text, name_color text, icon_url text, member_count bigint, rating_avg numeric, rating_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.slug, r.topic, r.description, r.category, r.rating, r.name_color, r.icon_url,
    (SELECT count(*) FROM public.room_members rm WHERE rm.room_id = r.id) AS member_count,
    (SELECT avg(rr.stars)::numeric FROM public.room_ratings rr WHERE rr.room_id = r.id) AS rating_avg,
    (SELECT count(*) FROM public.room_ratings rr WHERE rr.room_id = r.id) AS rating_count
  FROM public.rooms r
  WHERE r.is_direct = false AND r.invisible = false AND r.staff_only = false
  ORDER BY member_count DESC
  LIMIT _limit;
$$;