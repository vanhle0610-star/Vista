-- ============================================================================
-- Repeatable Seed Data for VISTA Demo (Tuần 8 / Code Freeze)
-- Includes:
-- 1. 3 Users: userA@vista.vn (Owner), userB@vista.vn (Member), userC@vista.vn (Non-member)
--    Default Password: Password123!
-- 2. 1 Sample Trip: "Khám phá Đà Nẵng 3 ngày" (Owner: userA)
-- 3. Trip Membership: userA (OWNER), userB (MEMBER / VIEWER)
-- 4. Sample Expenses / Budget: Đặt phòng khách sạn, Ăn tối hải sản
-- 5. Sample Trip Tasks: Đặt vé máy bay, Thuê xe máy
-- ============================================================================

-- 1. Users
INSERT INTO users (id, email, password_hash, display_name, status, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'userA@vista.vn', '$2a$10$uwgPjp333Y7T54ZrywQt4uZhy1mhOBakQBiaEzajaFW8fesfM68W2', 'Nguyễn Văn A (Owner)', 'ACTIVE', now(), now()),
  ('b0000000-0000-0000-0000-000000000002', 'userB@vista.vn', '$2a$10$uwgPjp333Y7T54ZrywQt4uZhy1mhOBakQBiaEzajaFW8fesfM68W2', 'Trần Thị B (Member)', 'ACTIVE', now(), now()),
  ('c0000000-0000-0000-0000-000000000003', 'userC@vista.vn', '$2a$10$uwgPjp333Y7T54ZrywQt4uZhy1mhOBakQBiaEzajaFW8fesfM68W2', 'Lê Văn C (Non-member)', 'ACTIVE', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Assign standard USER role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('userA@vista.vn', 'userB@vista.vn', 'userC@vista.vn') AND r.code = 'USER'
ON CONFLICT DO NOTHING;

-- 2. Sample Trip
INSERT INTO trips (id, owner_id, title, start_date, end_date, destination_summary, budget_total, currency, status, visibility, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Khám phá Đà Nẵng 3 ngày', '2026-11-15', '2026-11-18', 'Đà Nẵng & Hội An', 15000000.00, 'VND', 'PLANNING', 'PRIVATE', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Trip Members (userA as OWNER, userB as VIEWER/MEMBER)
INSERT INTO trip_members (trip_id, user_id, role, status, joined_at, budget_share)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE', now(), 7500000.00),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'VIEWER', 'ACTIVE', now(), 7500000.00)
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 4. Sample Expenses (Budget)
INSERT INTO expenses (id, trip_id, title, amount, currency, paid_by, category, occurred_at, status, created_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Đặt phòng khách sạn Đà Nẵng', 4500000.00, 'VND', 'a0000000-0000-0000-0000-000000000001', 'LODGING', now(), 'ACTIVE', now()),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Ăn tối hải sản Mỹ Khê', 1200000.00, 'VND', 'b0000000-0000-0000-0000-000000000002', 'FOOD', now(), 'ACTIVE', now())
ON CONFLICT (id) DO NOTHING;

-- 5. Sample Trip Tasks (trip_tasks)
INSERT INTO trip_tasks (id, trip_id, title, assignee_id, is_completed, created_at)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Đặt vé máy bay khứ hồi Hà Nội - Đà Nẵng', 'a0000000-0000-0000-0000-000000000001', true, now()),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Thuê xe máy di chuyển 3 ngày tại Hội An', 'b0000000-0000-0000-0000-000000000002', false, now())
ON CONFLICT (id) DO NOTHING;

