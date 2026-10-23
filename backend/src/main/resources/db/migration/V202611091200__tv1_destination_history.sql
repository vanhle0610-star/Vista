-- ==============================================================================
-- V202611091200__tv1_destination_history.sql
-- TV1: Bảng lưu lịch sử xem điểm đến của người dùng (Recently Viewed Destinations)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS destination_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    viewed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_destination_history_user_dest UNIQUE (user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_destination_history_user_viewed 
    ON destination_history(user_id, viewed_at DESC);
