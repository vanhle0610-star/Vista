ALTER TABLE posts ADD COLUMN feeling varchar(20);
ALTER TABLE posts ADD CONSTRAINT ck_posts_feeling CHECK (
    feeling IS NULL OR feeling IN ('HAPPY','DELIGHTED','EXCITED','RELAXED','GRATEFUL','CONFIDENT','SAD','TIRED')
);

ALTER TABLE comments ADD COLUMN root_id uuid;
ALTER TABLE comments ADD COLUMN reply_to_id uuid;
ALTER TABLE comments ADD COLUMN client_request_id uuid;
ALTER TABLE comments ADD COLUMN request_hash varchar(64);
ALTER TABLE comments ADD CONSTRAINT uq_comments_id_post UNIQUE (id, post_id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_root_post
    FOREIGN KEY (root_id, post_id) REFERENCES comments(id, post_id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_reply_post
    FOREIGN KEY (reply_to_id, post_id) REFERENCES comments(id, post_id);
ALTER TABLE comments ADD CONSTRAINT ck_comments_thread CHECK (
    (root_id IS NULL AND reply_to_id IS NULL)
    OR (root_id IS NOT NULL AND reply_to_id IS NOT NULL AND root_id <> id AND reply_to_id <> id)
);
CREATE UNIQUE INDEX uq_comments_client_request ON comments(user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;
CREATE INDEX idx_comments_thread_visible ON comments(post_id, root_id, created_at, id)
    WHERE status='VISIBLE' AND deleted_at IS NULL;
