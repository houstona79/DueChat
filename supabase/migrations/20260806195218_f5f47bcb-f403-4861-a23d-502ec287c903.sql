ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_color text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_color_format
  CHECK (name_color IS NULL OR name_color ~* '^#[0-9a-f]{6}$');

CREATE OR REPLACE FUNCTION public.reject_red_name_color()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r int; g int; b int;
BEGIN
  IF NEW.name_color IS NULL THEN
    RETURN NEW;
  END IF;
  r := ('x' || substr(NEW.name_color, 2, 2))::bit(8)::int;
  g := ('x' || substr(NEW.name_color, 4, 2))::bit(8)::int;
  b := ('x' || substr(NEW.name_color, 6, 2))::bit(8)::int;
  IF r >= 120 AND r > g * 2 AND r > b * 2 THEN
    RAISE EXCEPTION 'Red name colors are reserved for admins';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_reject_red_name_color ON public.profiles;
CREATE TRIGGER profiles_reject_red_name_color
BEFORE INSERT OR UPDATE OF name_color ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.reject_red_name_color();