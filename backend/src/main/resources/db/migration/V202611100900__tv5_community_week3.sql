-- Community only. Older TV5 migration may be ignored on databases already ahead of it.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status_before_hidden varchar(20);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS client_request_id uuid;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS request_hash varchar(64);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tv5_post_request ON posts(user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tv5_feed ON posts(created_at DESC, id DESC)
  WHERE status = 'VISIBLE' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tv5_comments ON comments(post_id, created_at DESC, id DESC)
  WHERE status = 'VISIBLE' AND deleted_at IS NULL;

CREATE TABLE community_uploads (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  storage_path text NOT NULL UNIQUE,
  mime_type varchar(50) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  status varchar(20) NOT NULL CHECK (status IN ('RESERVED', 'UPLOADED', 'ATTACHED', 'DELETE_PENDING')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  post_id uuid REFERENCES posts(id),
  CHECK ((status = 'ATTACHED' AND post_id IS NOT NULL) OR status <> 'ATTACHED')
);
CREATE INDEX idx_tv5_upload_cleanup ON community_uploads(status, expires_at);
