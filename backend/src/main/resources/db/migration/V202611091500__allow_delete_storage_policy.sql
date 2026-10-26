-- Policy: Allow Delete for vista-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow Delete vista-media'
  ) THEN
    CREATE POLICY "Allow Delete vista-media" ON storage.objects FOR DELETE USING (bucket_id = 'vista-media');
  END IF;
END $$;
