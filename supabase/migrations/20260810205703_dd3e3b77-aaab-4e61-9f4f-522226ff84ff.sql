CREATE OR REPLACE FUNCTION public.gift_shelf(_user_id uuid)
RETURNS TABLE(gift_key text, label text, emoji text, total bigint, last_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gi.key, gi.label, gi.emoji, count(*)::bigint, max(g.created_at)
  FROM public.gifts g
  JOIN public.gift_items gi ON gi.key = g.gift_key
  WHERE g.recipient_id = _user_id
  GROUP BY gi.key, gi.label, gi.emoji, gi.sort_order
  ORDER BY count(*) DESC, gi.sort_order ASC
  LIMIT 24
$$;

GRANT EXECUTE ON FUNCTION public.gift_shelf(uuid) TO authenticated, anon;