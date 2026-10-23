# BÁO CÁO RÀ SOÁT VÀ ĐỐI CHIẾU DDL / FLYWAY BASELINE SCHEMA (W1-TV2-04)

> **Người thực hiện:** TV2 (Backend Core & Database Migration Lead)  
> **Tài liệu đối chiếu:** `VISTA_SRS_v1.docx`, `module-boundaries.md`, `TEAM_CODING_RULES.md`  
> **File baseline hiện tại:** `backend/src/main/resources/db/migration/V202610171200__baseline_schema.sql`  

---

## 1. Tổng quan hiện trạng

- File migration `V202610171200__baseline_schema.sql` đã được commit trong Git (commit `f6c6da4`).
- Định nghĩa tổng cộng **29 bảng**, bật extension `pgcrypto`, tạo 6 index tối ưu truy vấn và seed sẵn 3 bản ghi cho bảng `roles`.
- Tuân thủ nguyên tắc bất biến (Immutability): **Không được sửa đổi nội dung file baseline này**. Mọi thay đổi sau này bắt buộc phải tạo file migration mới: `V<timestamp>__<tv>_<mô_tả>.sql`.

---

## 2. Đối chiếu chi tiết các bảng thuộc phạm vi sở hữu của TV2

| Tên bảng | Khóa chính (PK) | Khóa ngoại (FK) | Ràng buộc chính (Constraints) | Đánh giá tính sẵn sàng |
|---|---|---|---|---|
| **`users`** | `id uuid DEFAULT gen_random_uuid()` | Không | `email UNIQUE`, `status DEFAULT 'ACTIVE'`, `version DEFAULT 0`, `emergency_contact jsonb` | Đầy đủ trường cho Auth & Profile. `emergency_contact` dạng JSONB rất linh hoạt. |
| **`roles`** | `id uuid DEFAULT gen_random_uuid()` | Không | `code varchar(30) UNIQUE` | Đã seed 3 role: `'USER'`, `'MODERATOR'`, `'ADMIN'`. |
| **`user_roles`** | `(user_id, role_id)` | FK `users(id)` ON DELETE CASCADE, FK `roles(id)` ON DELETE RESTRICT | Composite Primary Key | Đảm bảo tính toàn vẹn phân quyền. |
| **`trips`** | `id uuid DEFAULT gen_random_uuid()` | FK `owner_id -> users(id)` | `CHECK (end_date >= start_date)`, `CHECK (budget_total IS NULL OR budget_total >= 0)`, `version bigint NOT NULL DEFAULT 0` | Đầy đủ cho Trip Core và Optimistic Locking. |
| **`trip_members`** | `(trip_id, user_id)` | FK `trips(id)` ON DELETE CASCADE, FK `users(id)` ON DELETE CASCADE | Composite Primary Key, `role` (OWNER/MEMBER), `status` | Hỗ trợ truy vấn membership và phân quyền chuyến đi. Index `idx_trip_members_user(user_id, status)` đã có sẵn. |
| **`trip_invitations`** | `id uuid DEFAULT gen_random_uuid()` | FK `trip_id -> trips(id)`, FK `invited_by -> users(id)` | `token_hash UNIQUE`, `status DEFAULT 'PENDING'` | Đầy đủ cho luồng mời thành viên. |
| **`audit_logs`** | `id uuid DEFAULT gen_random_uuid()` | FK `actor_id -> users(id)` | `metadata_json jsonb DEFAULT '{}'::jsonb`, `created_at DEFAULT now()` | Đầy đủ cho việc lưu vết kiểm toán hệ thống. |

---

## 3. Các điểm không đồng nhất (Discrepancies) giữa tài liệu và Baseline SQL

1. **`user_emergency_contacts` vs `users.emergency_contact`:**
   - Trong `module-boundaries.md` và `TEAM_CODING_RULES.md` liệt kê bảng riêng `user_emergency_contacts`.
   - Trong `V202610171200__baseline_schema.sql` cột `emergency_contact jsonb` được tích hợp trực tiếp vào bảng `users`.
   - **Kết luận TV2:** Giữ nguyên thiết kế JSONB trong bảng `users` như baseline hiện tại (phù hợp với dữ liệu liên hệ khẩn cấp đơn giản gồm name, phone, relationship mà không cần join bảng phức tạp).
2. **Các bảng của thành viên khác chưa có trong Baseline SQL:**
   - **TV3:** Tài liệu liệt kê `device_tokens` nhưng baseline chưa có. (TV3 sẽ nộp migration riêng ở Tuần 6 khi làm Push Notification).
   - **TV4:** Tài liệu liệt kê `budgets`, `ai_generation_jobs`, `ai_feedback` nhưng baseline chưa có. (TV4 sẽ nộp migration riêng ở Tuần 4 & Tuần 5).
3. **Độ lệch tên bảng giữa tài liệu mô tả và SQL:**
   - Tài liệu ghi `invitations` ➔ SQL là `trip_invitations`.
   - Tài liệu ghi `proposals` ➔ SQL là `destination_proposals`.
   - Tài liệu ghi `votes` ➔ SQL là `destination_votes`.
   - Tài liệu ghi `post_comments` ➔ SQL là `comments`.
   - Tài liệu ghi `check_ins` ➔ SQL là `checkins`.
   - **Kết luận TV2:** Tên bảng trong SQL rõ ràng hơn và tránh xung đột từ khóa SQL (như `votes`, `comments`), tất cả thành viên thống nhất dùng tên bảng chuẩn theo file baseline SQL.

