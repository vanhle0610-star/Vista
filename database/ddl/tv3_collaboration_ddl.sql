-- =============================================================================
-- DỰ ÁN VISTA - BẢN THIẾT KẾ DDL MODULE GROUP COLLABORATION (TV3)
-- Phụ trách: TV3 (Invited User / Trip Member)
-- Hạn nộp TV2: Trước Thứ 3 (21/10/2026) để tích hợp vào Flyway migration
-- 7 bảng: invitations, itinerary_days, itinerary_items, proposals, votes, notifications, device_tokens
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG INVITATIONS (Lời mời tham gia chuyến đi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chỉ cho phép duy nhất 1 lời mời PENDING đối với mỗi cặp (trip_id, invitee_email)
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_trip_email_pending 
    ON invitations(trip_id, lower(invitee_email)) 
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_invitations_trip_status 
    ON invitations(trip_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_token 
    ON invitations(token);

-- -----------------------------------------------------------------------------
-- 2. BẢNG ITINERARY_DAYS (Ngày trong lịch trình chuyến đi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_days (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    day_number INT NOT NULL CHECK (day_number >= 1),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_itinerary_days_trip_day UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_date 
    ON itinerary_days(trip_id, date);

-- -----------------------------------------------------------------------------
-- 3. BẢNG ITINERARY_ITEMS (Chi tiết điểm dừng / hoạt động theo ngày)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_items (
    id BIGSERIAL PRIMARY KEY,
    day_id BIGINT NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    destination_id BIGINT,
    start_time TIME,
    end_time TIME,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_itinerary_items_time_range CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_order 
    ON itinerary_items(day_id, sort_order ASC);

-- -----------------------------------------------------------------------------
-- 4. BẢNG PROPOSALS (Đề xuất địa điểm từ thành viên nhóm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    proposer_id BIGINT NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'APPROVED', 'REJECTED')),
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_trip_status 
    ON proposals(trip_id, status);

-- -----------------------------------------------------------------------------
-- 5. BẢNG VOTES (Biểu quyết cho địa điểm đề xuất)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id BIGINT NOT NULL,
    value INT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_votes_proposal_voter UNIQUE (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_proposal 
    ON votes(proposal_id);

-- -----------------------------------------------------------------------------
-- 6. BẢNG NOTIFICATIONS (Thông báo in-app tập trung)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    payload_json JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, created_at DESC) 
    WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- 7. BẢNG DEVICE_TOKENS (Lưu Push Notification Token của thiết bị)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('IOS', 'ANDROID', 'WEB')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active 
    ON device_tokens(user_id) 
    WHERE is_active = true;

