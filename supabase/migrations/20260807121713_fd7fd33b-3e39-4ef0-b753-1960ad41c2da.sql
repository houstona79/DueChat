ALTER TABLE public.rooms
  ADD COLUMN rating text NOT NULL DEFAULT 'G';

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_rating_check CHECK (rating IN ('G','R'));