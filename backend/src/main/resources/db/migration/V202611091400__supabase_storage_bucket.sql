-- Supabase Storage Bucket Initialization for VISTA Cloud Media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vista-media',
    'vista-media',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow Public Read for vista-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access vista-media'
  ) THEN
    CREATE POLICY "Public Access vista-media" ON storage.objects FOR SELECT USING (bucket_id = 'vista-media');
  END IF;
END $$;

-- Policy: Allow Upload for vista-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow Upload vista-media'
  ) THEN
    CREATE POLICY "Allow Upload vista-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vista-media');
  END IF;
END $$;

-- Policy: Allow Update for vista-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow Update vista-media'
  ) THEN
    CREATE POLICY "Allow Update vista-media" ON storage.objects FOR UPDATE USING (bucket_id = 'vista-media');
  END IF;
END $$;
