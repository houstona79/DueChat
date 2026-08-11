ALTER TABLE public.gift_items ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO public.gift_items (key, label, emoji, cost, sort_order, image_url) VALUES
  ('sticker_cupcake', 'Cupcake', '🧁', 15, 100, '/__l5e/assets-v1/f3b47845-fd59-4fb8-a2be-922683e49c6a/sticker-cupcake.png'),
  ('sticker_puppy', 'Puppy love', '🐶', 25, 101, '/__l5e/assets-v1/f8a5b88e-2828-4d5b-ba34-485ea9488408/sticker-puppy.png'),
  ('sticker_boombox', 'Boombox', '📻', 20, 102, '/__l5e/assets-v1/448e934f-166c-4567-8bdc-5e01f51df9b4/sticker-boombox.png'),
  ('sticker_rocket', 'Rocket', '🚀', 30, 103, '/__l5e/assets-v1/04dceecd-c853-4256-99c0-e5ac22980b6c/sticker-rocket.png'),
  ('sticker_crown', 'Crown', '👑', 50, 104, '/__l5e/assets-v1/173280ab-6bba-46d6-ab7c-6f54d787386a/sticker-crown.png'),
  ('sticker_sunflowers', 'Sunflowers', '🌻', 20, 105, '/__l5e/assets-v1/25c86fee-3288-407c-a223-aa8e50f33455/sticker-sunflowers.png')
ON CONFLICT (key) DO UPDATE SET image_url = excluded.image_url, cost = excluded.cost, sort_order = excluded.sort_order;

DROP FUNCTION IF EXISTS public.gift_shelf(uuid);

CREATE FUNCTION public.gift_shelf(_user_id uuid)
 RETURNS TABLE(gift_key text, label text, emoji text, image_url text, total bigint, last_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT gi.key, gi.label, gi.emoji, gi.image_url, count(*)::bigint, max(g.created_at)
  FROM public.gifts g
  JOIN public.gift_items gi ON gi.key = g.gift_key
  WHERE g.recipient_id = _user_id
  GROUP BY gi.key, gi.label, gi.emoji, gi.image_url, gi.sort_order
  ORDER BY count(*) DESC, gi.sort_order ASC
  LIMIT 24
$function$;