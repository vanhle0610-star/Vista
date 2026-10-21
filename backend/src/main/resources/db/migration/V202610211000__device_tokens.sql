-- TV3: Bảng lưu push notification tokens (FCM/APNs) cho mỗi thiết bị của user
CREATE TABLE IF NOT EXISTS device_tokens (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       text        NOT NULL UNIQUE,
    platform    varchar(10) NOT NULL CHECK (platform IN ('FCM', 'APNS')),
    device_name varchar(200),
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
    ON device_tokens(user_id, is_active)
    WHERE is_active = true;
