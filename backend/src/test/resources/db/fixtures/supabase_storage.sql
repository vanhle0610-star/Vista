-- Testcontainers supplies PostgreSQL; Supabase normally provisions these tables.
-- Keep them empty so the production migrations create the bucket and policies.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean NOT NULL DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text NOT NULL
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
