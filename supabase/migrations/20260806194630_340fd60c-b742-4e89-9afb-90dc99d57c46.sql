CREATE TABLE public.buddies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, buddy_id),
  CHECK (owner_id <> buddy_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buddies TO authenticated;
GRANT ALL ON public.buddies TO service_role;

ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own buddies" ON public.buddies FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can add buddies" ON public.buddies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own buddies" ON public.buddies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can remove their own buddies" ON public.buddies FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER buddies_set_updated_at BEFORE UPDATE ON public.buddies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.buddies;