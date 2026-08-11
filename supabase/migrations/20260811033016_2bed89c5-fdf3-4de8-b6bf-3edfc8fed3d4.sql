CREATE OR REPLACE FUNCTION public.room_crowns()
RETURNS TABLE(room_id uuid, slug text, period text, join_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH periods AS (
    SELECT 'day'::text AS period, now() - interval '1 day' AS since
    UNION ALL SELECT 'week', now() - interval '7 days'
    UNION ALL SELECT 'month', now() - interval '30 days'
  ), eligible AS (
    SELECT r.id, r.slug
    FROM public.rooms r
    WHERE NOT r.is_direct AND NOT r.invisible AND NOT r.staff_only
      AND lower(coalesce(r.category, '')) <> 'help'
      AND r.name !~* '^staff room$'
  ), counted AS (
    SELECT p.period, e.id, e.slug,
           (SELECT count(*) FROM public.room_events ev
             WHERE ev.room_id = e.id AND ev.kind = 'join' AND ev.created_at >= p.since) AS joins
    FROM periods p CROSS JOIN eligible e
  ), ranked AS (
    SELECT period, id, slug, joins,
           row_number() OVER (PARTITION BY period ORDER BY joins DESC, slug ASC) AS rn
    FROM counted
    WHERE joins > 0
  )
  SELECT id, slug, period, joins FROM ranked WHERE rn = 1
$$;

GRANT EXECUTE ON FUNCTION public.room_crowns() TO anon, authenticated, service_role;