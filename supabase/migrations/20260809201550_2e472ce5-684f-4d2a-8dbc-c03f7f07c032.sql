CREATE POLICY "Blog covers are readable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-covers');

CREATE POLICY "Members can upload their own blog covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Members can update their own blog covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-covers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'blog-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Members can delete their own blog covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-covers' AND (storage.foldername(name))[1] = auth.uid()::text);