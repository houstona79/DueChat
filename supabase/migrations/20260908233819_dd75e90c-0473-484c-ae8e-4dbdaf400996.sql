ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_bold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_underlined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_size smallint NOT NULL DEFAULT 1;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_font_size_range,
  ADD CONSTRAINT messages_font_size_range CHECK (font_size BETWEEN 1 AND 4);