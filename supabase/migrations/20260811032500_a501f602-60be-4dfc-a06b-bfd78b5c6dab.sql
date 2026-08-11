CREATE OR REPLACE FUNCTION public.top_rooms_since(_since timestamptz, _limit integer DEFAULT 3)
RETURNS TABLE(
  id uuid, name text, slug text, topic text, category text, rating text,
  name_color text, icon_url text, member_count bigint,
  rating_avg numeric, rating_count bigint, join_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.slug, r.topic, r.category, r.rating, r.name_color, r.icon_url,
         (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id),
         (SELECT round(avg(rr.stars), 2) FROM public.room_ratings rr WHERE rr.room_id = r.id),
         (SELECT count(*) FROM public.room_ratings rr WHERE rr.room_id = r.id),
         (SELECT count(*) FROM public.room_events e
           WHERE e.room_id = r.id AND e.kind = 'join' AND e.created_at >= _since) AS join_count
  FROM public.rooms r
  WHERE NOT r.is_direct AND NOT r.invisible AND NOT r.staff_only
    AND lower(coalesce(r.category, '')) <> 'help'
    AND r.name !~* '^staff room$'
  ORDER BY join_count DESC,
           (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id) DESC,
           r.name ASC
  LIMIT LEAST(COALESCE(_limit, 3), 20)
$$;

GRANT EXECUTE ON FUNCTION public.top_rooms_since(timestamptz, integer) TO anon, authenticated, service_role;