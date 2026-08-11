ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS name_color text;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_name_color_hex;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_name_color_hex
  CHECK (name_color IS NULL OR name_color ~* '^#[0-9a-f]{6}$');