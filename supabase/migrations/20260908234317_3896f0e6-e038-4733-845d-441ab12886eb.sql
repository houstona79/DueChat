ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS text_color text;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_text_color_hex,
  ADD CONSTRAINT messages_text_color_hex
    CHECK (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$');