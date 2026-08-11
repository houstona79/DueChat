DROP FUNCTION IF EXISTS public.public_room_profile(text);

CREATE OR REPLACE FUNCTION public.public_room_profile(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, topic text, status_message text, category text, rating text, name_color text, icon_url text, banner_url text, website_url text, website_label text, radio_url text, radio_name text, created_at timestamp with time zone, member_count bigint, rating_avg numeric, rating_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.name, r.slug, r.topic, r.status_message, r.category,
         r.rating, r.name_color, r.icon_url, r.banner_url,
         r.website_url, r.website_label, r.radio_url, r.radio_name, r.created_at,
         (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id),
         (SELECT round(avg(rr.stars), 2) FROM public.room_ratings rr WHERE rr.room_id = r.id),
         (SELECT count(*) FROM public.room_ratings rr WHERE rr.room_id = r.id)
  FROM public.rooms r
  WHERE lower(r.slug) = lower(_slug)
    AND NOT r.is_direct
    AND NOT r.invisible
    AND NOT r.staff_only
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.public_room_profile(text) TO anon, authenticated, service_role;