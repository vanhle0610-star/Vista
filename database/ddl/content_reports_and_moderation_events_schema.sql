-- ============================================================================
-- VISTA PLATFORM - DDL FOR CONTENT REPORTS & MODERATION EVENTS
-- Module: Content Safety & Moderation (TV5 ownership / TV1 Admin integration)
-- Prepared by: TV1 (Destination & Admin Web Lead)
-- For review by: TV2 (Backend Core & Flyway Lead)
-- Database Target: PostgreSQL 17 (Supabase / Local Docker)
-- ============================================================================

-- BẢNG 1: content_reports
-- Mục đích: Lưu trữ báo cáo vi phạm nội dung do người dùng gửi từ Mobile / Web
CREATE TABLE IF NOT EXISTS content_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_type varchar(30) NOT NULL,
    target_id uuid NOT NULL,
    reason_category varchar(50) NOT NULL DEFAULT 'OTHER',
    reason text NOT NULL,
    details text,
    status varchar(30) NOT NULL DEFAULT 'OPEN',
    handled_by uuid REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes text,
    handled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Ràng buộc loại đối tượng được phép báo cáo trong hệ thống VISTA
    CONSTRAINT chk_content_reports_target_type CHECK (
        target_type IN ('POST', 'COMMENT', 'REVIEW', 'DESTINATION', 'TRIP')
    ),

    -- Ràng buộc danh mục lý do báo cáo chuẩn hóa
    CONSTRAINT chk_content_reports_reason_category CHECK (
        reason_category IN (
            'SPAM', 
            'INAPPROPRIATE', 
            'HARASSMENT', 
            'FALSE_INFORMATION', 
            'COPYRIGHT', 
            'VIOLENCE', 
            'OTHER'
        )
    ),

    -- Ràng buộc vòng đời trạng thái xử lý
    CONSTRAINT chk_content_reports_status CHECK (
        status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')
    )
);

-- Comments mô tả ngữ nghĩa các cột
COMMENT ON TABLE content_reports IS 'Hàng đợi báo cáo vi phạm nội dung người dùng gửi từ Mobile app / Web';
COMMENT ON COLUMN content_reports.target_type IS 'Loại thực thể bị báo cáo: POST (bài viết TV5), COMMENT (bình luận TV5), REVIEW (đánh giá TV1), DESTINATION (thông tin điểm đến sai lệch TV1), TRIP (chuyến đi vi phạm TV2)';
COMMENT ON COLUMN content_reports.target_id IS 'UUID của đối tượng bị báo cáo (Polymorphic ID, ứng dụng quản lý toàn vẹn tham chiếu)';
COMMENT ON COLUMN content_reports.handled_by IS 'Tài khoản Moderator / Admin xử lý báo cáo';
COMMENT ON COLUMN content_reports.status IS 'Trạng thái xử lý: OPEN (mới), IN_REVIEW (đang xem xét), RESOLVED (đã xử lý/ẩn nội dung), DISMISSED (bác bỏ)';

-- Indexes tối ưu hiệu năng
-- 1. Hàng đợi kiểm duyệt cho Admin/Moderator (lọc theo trạng thái, sắp xếp theo thời gian gửi)
CREATE INDEX IF NOT EXISTS idx_content_reports_queue 
    ON content_reports(status, created_at ASC);

-- 2. Tra cứu lịch sử báo cáo của một đối tượng cụ thể (để đếm số lượng report của 1 bài viết/review)
CREATE INDEX IF NOT EXISTS idx_content_reports_target 
    ON content_reports(target_type, target_id);

-- 3. Chống báo cáo trùng lặp (1 user không thể gửi 2 report cho cùng 1 target khi report trước chưa xử lý)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_dedup_active 
    ON content_reports(reporter_id, target_type, target_id) 
    WHERE status IN ('OPEN', 'IN_REVIEW');

-- 4. Tra cứu các báo cáo do một moderator đã xử lý
CREATE INDEX IF NOT EXISTS idx_content_reports_handler 
    ON content_reports(handled_by, handled_at DESC) 
    WHERE handled_by IS NOT NULL;


-- ============================================================================
-- BẢNG 2: moderation_events
-- Mục đích: Ghi nhận lịch sử kiểm duyệt (Automated Rule, AI Toxicity Scoring, Manual Moderator Action)
-- Phân biệt: Không trùng lặp với audit_logs (audit_logs dùng cho log hệ thống toàn cục của TV2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS moderation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid REFERENCES content_reports(id) ON DELETE SET NULL,
    target_type varchar(30) NOT NULL,
    target_id uuid NOT NULL,
    rule_score numeric(5,4),
    ai_score numeric(5,4),
    reasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    action varchar(40) NOT NULL,
    reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action_reason text,
    previous_status varchar(30),
    next_status varchar(30),
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Ràng buộc loại đối tượng kiểm duyệt
    CONSTRAINT chk_moderation_events_target_type CHECK (
        target_type IN ('POST', 'COMMENT', 'REVIEW', 'DESTINATION', 'TRIP')
    ),

    -- Điểm số AI / Rule nằm trong khoảng [0.0, 1.0]
    CONSTRAINT chk_moderation_events_rule_score CHECK (
        rule_score IS NULL OR (rule_score >= 0.0 AND rule_score <= 1.0)
    ),
    CONSTRAINT chk_moderation_events_ai_score CHECK (
        ai_score IS NULL OR (ai_score >= 0.0 AND ai_score <= 1.0)
    ),

    -- Danh mục các hành động kiểm duyệt cho phép
    CONSTRAINT chk_moderation_events_action CHECK (
        action IN (
            'AUTO_FLAG',        -- Hệ thống tự động gắn cờ nghi vấn
            'AUTO_APPROVE',     -- Hệ thống tự động duyệt qua
            'AUTO_HIDE',        -- Hệ thống tự động ẩn do điểm AI vượt ngưỡng độc hại
            'MANUAL_APPROVE',   -- Moderator duyệt hiển thị nội dung
            'MANUAL_HIDE',      -- Moderator ẩn nội dung khỏi feed công khai
            'MANUAL_RESTORE',   -- Moderator khôi phục nội dung đã bị ẩn trước đó
            'MANUAL_DELETE',    -- Moderator xóa vĩnh viễn nội dung vi phạm nghiêm trọng
            'WARN_AUTHOR',      -- Gửi cảnh cáo đến tác giả vi phạm
            'DISMISS_REPORT'    -- Bác bỏ báo cáo sai sự thật
        )
    )
);

COMMENT ON TABLE moderation_events IS 'Nhật ký truy vết hành động kiểm duyệt nội dung (tự động bằng Rule/AI hoặc thủ công bởi Moderator)';
COMMENT ON COLUMN moderation_events.report_id IS 'Khóa ngoại tham chiếu đến báo cáo gây ra hành động này (NULL nếu là tự động scan hoặc chủ động duyệt)';
COMMENT ON COLUMN moderation_events.rule_score IS 'Điểm đánh giá từ bộ lọc từ khóa/quy tắc tĩnh (0.0000 - 1.0000)';
COMMENT ON COLUMN moderation_events.ai_score IS 'Điểm đánh giá độc hại từ mô hình AI (0.0000 - 1.0000)';
COMMENT ON COLUMN moderation_events.reasons_json IS 'Chi tiết các quy tắc vi phạm hoặc tag nhãn AI phát hiện dạng JSONB';
COMMENT ON COLUMN moderation_events.action IS 'Hành động kiểm duyệt được thực thi';
COMMENT ON COLUMN moderation_events.reviewer_id IS 'ID người thực hiện kiểm duyệt (NULL nếu là tiến trình tự động)';
COMMENT ON COLUMN moderation_events.previous_status IS 'Trạng thái của nội dung trước khi kiểm duyệt (ví dụ PENDING, VISIBLE, HIDDEN)';
COMMENT ON COLUMN moderation_events.next_status IS 'Trạng thái của nội dung sau khi kiểm duyệt (ví dụ VISIBLE, HIDDEN, DELETED)';

-- Indexes tối ưu truy vấn kiểm duyệt
-- 1. Tra cứu toàn bộ lịch sử kiểm duyệt của một nội dung cụ thể
CREATE INDEX IF NOT EXISTS idx_moderation_events_target 
    ON moderation_events(target_type, target_id, created_at DESC);

-- 2. Lịch sử thao tác theo từng kiểm duyệt viên
CREATE INDEX IF NOT EXISTS idx_moderation_events_reviewer 
    ON moderation_events(reviewer_id, created_at DESC) 
    WHERE reviewer_id IS NOT NULL;

-- 3. Tra cứu sự kiện phát sinh từ một báo cáo cụ thể
CREATE INDEX IF NOT EXISTS idx_moderation_events_report 
    ON moderation_events(report_id) 
    WHERE report_id IS NOT NULL;

-- 4. Thống kê theo dõi điểm AI cao để đánh giá độ chính xác của AI
CREATE INDEX IF NOT EXISTS idx_moderation_events_ai_flagged 
    ON moderation_events(ai_score, created_at DESC) 
    WHERE ai_score >= 0.7;
