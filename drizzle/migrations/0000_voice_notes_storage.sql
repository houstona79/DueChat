CREATE POLICY "Members upload own voice notes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members listen to voice notes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-notes');
CREATE POLICY "Members delete own voice notes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);