-- ============================================================================
-- VISTA FLYWAY MIGRATION PROPOSAL
-- Version: V202610211000__tv1_enhance_content_reports_and_moderation.sql
-- Module: Content Safety & Moderation (TV1 Admin handover to TV2 Backend Core)
-- Description: Bổ sung ràng buộc CHECK, index chống spam báo cáo và liên kết report_id
-- ============================================================================

-- 1. Nâng cấp bảng content_reports
ALTER TABLE content_reports 
    ADD COLUMN IF NOT EXISTS reason_category varchar(50) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN IF NOT EXISTS details text,
    ADD COLUMN IF NOT EXISTS resolution_notes text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Bổ sung CHECK constraints nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_content_reports_target_type') THEN
        ALTER TABLE content_reports ADD CONSTRAINT chk_content_reports_target_type 
            CHECK (target_type IN ('POST', 'COMMENT', 'REVIEW', 'DESTINATION', 'TRIP'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_content_reports_status') THEN
        ALTER TABLE content_reports ADD CONSTRAINT chk_content_reports_status 
            CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_content_reports_reason_category') THEN
        ALTER TABLE content_reports ADD CONSTRAINT chk_content_reports_reason_category 
            CHECK (reason_category IN ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'FALSE_INFORMATION', 'COPYRIGHT', 'VIOLENCE', 'OTHER'));
    END IF;
END $$;

-- Tạo index chống gửi báo cáo trùng lặp cho cùng 1 nội dung đang chờ duyệt
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_dedup_active 
    ON content_reports(reporter_id, target_type, target_id) 
    WHERE status IN ('OPEN', 'IN_REVIEW');

-- Tạo index tra cứu target bị báo cáo
CREATE INDEX IF NOT EXISTS idx_content_reports_target 
    ON content_reports(target_type, target_id);


-- 2. Nâng cấp bảng moderation_events
ALTER TABLE moderation_events 
    ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES content_reports(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS action_reason text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moderation_events_target_type') THEN
        ALTER TABLE moderation_events ADD CONSTRAINT chk_moderation_events_target_type 
            CHECK (target_type IN ('POST', 'COMMENT', 'REVIEW', 'DESTINATION', 'TRIP'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moderation_events_rule_score') THEN
        ALTER TABLE moderation_events ADD CONSTRAINT chk_moderation_events_rule_score 
            CHECK (rule_score IS NULL OR (rule_score >= 0.0 AND rule_score <= 1.0));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moderation_events_ai_score') THEN
        ALTER TABLE moderation_events ADD CONSTRAINT chk_moderation_events_ai_score 
            CHECK (ai_score IS NULL OR (ai_score >= 0.0 AND ai_score <= 1.0));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moderation_events_action') THEN
        ALTER TABLE moderation_events ADD CONSTRAINT chk_moderation_events_action 
            CHECK (action IN (
                'AUTO_FLAG', 'AUTO_APPROVE', 'AUTO_HIDE', 
                'MANUAL_APPROVE', 'MANUAL_HIDE', 'MANUAL_RESTORE', 
                'MANUAL_DELETE', 'WARN_AUTHOR', 'DISMISS_REPORT'
            ));
    END IF;
END $$;

-- Indexes tối ưu truy vết
CREATE INDEX IF NOT EXISTS idx_moderation_events_target 
    ON moderation_events(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_events_reviewer 
    ON moderation_events(reviewer_id, created_at DESC) 
    WHERE reviewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_events_report 
    ON moderation_events(report_id) 
    WHERE report_id IS NOT NULL;
