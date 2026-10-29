-- Đảm bảo mỗi chuyến đi chỉ có duy nhất 1 thành viên đang hoạt động mang vai trò OWNER (BR-01)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_single_active_owner 
ON trip_members (trip_id) 
WHERE role = 'OWNER' AND status = 'ACTIVE';

