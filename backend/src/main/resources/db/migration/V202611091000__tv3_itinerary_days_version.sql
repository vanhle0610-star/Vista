-- TV3 W4: Thêm cột version cho optimistic locking trên bảng itinerary_days
ALTER TABLE itinerary_days ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
