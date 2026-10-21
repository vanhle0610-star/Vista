# TÀI LIỆU BÀN GIAO THIẾT KẾ BACKEND TUẦN 1 (HANDOVER TO TV2)

> **Người bàn giao:** TV1 (Guest / Visitor — Destination Discovery & Admin Web Lead)  
> **Người nhận bàn giao:** TV2 (Registered User / Trip Owner — Backend Core & Flyway Lead)  
> **Thời điểm bàn giao:** Trước Thứ 3 — Tuần 1  
> **Dự án:** VISTA — Vietnam Smart Travel Platform  
> **Phạm vi bàn giao:**
> 1. Chốt cấu trúc dữ liệu địa điểm (Destination Schema) & Mẫu CSV nhập liệu.
> 2. Bộ dữ liệu mục tiêu 30 địa điểm du lịch có nguồn kiểm chứng thuộc 3 địa phương.
> 3. Thiết kế DDL hoàn thiện cho 2 bảng `content_reports` và `moderation_events`.
> 4. Script nâng cấp Flyway Migration đề xuất và hướng dẫn tích hợp an toàn.

---

## 1. TỔNG QUAN CÁC ĐẦU RA BÀN GIAO (DELIVERABLES)

| STT | Hạng mục bàn giao | Vị trí file trong Repository | Mục đích sử dụng |
|:---:|---|---|---|
| **1** | **Tài liệu Destination Schema** | `docs/architecture/destination-data-schema.md` | Chuẩn hóa cấu trúc địa điểm, giá vé, giờ mở cửa cấu trúc 7 ngày cho AI Planner (TV4) & Lịch trình (TV3). |
| **2** | **Mẫu CSV nhập liệu chuẩn** | `database/seed/destinations/sample.schema.csv` | File mẫu CSV chuẩn hóa 12 cột cho script importer tự động (W2-10). |
| **3** | **Bộ dữ liệu 30 địa điểm có nguồn** | `database/seed/destinations/demo_destinations_seed.csv` | Dữ liệu thật đã kiểm chứng của Đà Nẵng, Thừa Thiên Huế, Quảng Nam. |
| **4** | **Hướng dẫn Seed Data** | `database/seed/destinations/README.md` | Từ điển dữ liệu CSV và quy tắc nạp dữ liệu Idempotent. |
| **5** | **DDL Độc lập chuẩn hóa** | `database/ddl/content_reports_and_moderation_events_schema.sql` | DDL chuẩn có đầy đủ ràng buộc CHECK, index và comment mô tả. |
| **6** | **Flyway Migration Patch** | `database/ddl/V202610211000__tv1_enhance_content_reports_and_moderation.sql` | Script `ALTER TABLE` cắm chạy ngay không làm mất dữ liệu hiện tại trên Supabase. |

---

## 2. NỘI DUNG A: CẤU TRÚC ĐỊA ĐIỂM (DESTINATION SCHEMA) & CSV

### 2.1. Chuẩn Hóa Cấu Trúc Đã Chốt
- Bảng `destinations` liên kết với `provinces` (tỉnh/thành) và `destination_categories` (danh mục).
- Quan hệ ảnh 1-N: Bảng `destination_images` lưu nhiều ảnh với `sort_order` (`0` là ảnh bìa đại diện).
- Quan hệ yêu thích N-N: Bảng `favorites (user_id, destination_id)`.
- Khóa lạc quan: Cột `version bigint NOT NULL DEFAULT 0` hỗ trợ tránh xung đột khi nhiều admin cùng chỉnh sửa thông tin điểm đến trên trang quản trị.

### 2.2. Điểm Nhấn Nghiệp Vụ Quan Trọng
1. **Thông tin giá vé (`price_min`, `price_max` dạng `NUMERIC(15,2)`):**
   - Miễn phí: `price_min = 0, price_max = 0`.
   - Giá cố định: `price_min = price_max = X` (ví dụ `200000`).
   - Khoảng giá vé: `price_min < price_max` (ví dụ Bà Nà Hills: `900000` đến `1250000`).
   - Chưa rõ thông tin: Lưu `NULL, NULL` (Frontend hiển thị "Chưa có thông tin giá vé", **tuyệt đối không hiển thị 0 đ** để tránh hiểu nhầm).
2. **Giờ mở cửa dạng cấu trúc (`opening_hours` JSONB):**
   - Khóa 7 ngày: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`.
   - Giá trị: chuỗi `"HH:mm-HH:mm"` (chuẩn 24h), `"00:00-23:59"` (24/7), hoặc `"closed"` (ngày nghỉ).
   - *Lợi ích:* Backend và AI Planner (TV4) có thể parse tự động hàm `isOpenAt(dayOfWeek, time)` khi lập lịch trình cho khách du lịch.
3. **Nguồn dữ liệu & Xác minh:**
   - Cột `source_url` trỏ tới website chính thức của ban quản lý di tích / cổng du lịch địa phương.
   - Cột `verified_at` ghi thời điểm UTC kiểm chứng (`2026-10-15T00:00:00Z`).

---

## 3. NỘI DUNG B: BẢNG `content_reports` (BÁO CÁO NỘI DUNG)

### 3.1. Phân Tích Hiện Trạng Trong Baseline Schema
Trong baseline migration `V202610171200__baseline_schema.sql`, bảng `content_reports` đã được khởi tạo sơ bộ:
```sql
CREATE TABLE content_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES users(id),
    target_type varchar(30) NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'OPEN',
    handled_by uuid REFERENCES users(id),
    handled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

### 3.2. Các Điểm Bổ Sung / Cải Tiến Đề Xuất
1. **Ràng buộc `target_type`:**
   - Hệ thống VISTA hỗ trợ báo cáo 5 loại thực thể:
     `CHECK (target_type IN ('POST', 'COMMENT', 'REVIEW', 'DESTINATION', 'TRIP'))`.
2. **Khóa ngoại đa hình (Polymorphic FK Trade-off):**
   - *Phân tích kỹ thuật:* `target_id` trỏ đến nhiều bảng khác nhau (`posts`, `comments`, `reviews`, `destinations`, `trips`).
   - *Quyết định:* Giữ nguyên thiết kế `target_type + target_id` (không tạo 5 cột nullable FK riêng biệt `post_id`, `comment_id`,...) để schema gọn gàng và dễ mở rộng khi thêm thực thể mới. Tính toàn vẹn tham chiếu được kiểm tra ở tầng ứng dụng (Service Layer) trước khi ghi bản ghi.
3. **Chống Spam báo cáo trùng lặp:**
   - Một người dùng không được gửi liên tiếp nhiều báo cáo cho cùng một đối tượng khi báo cáo trước đó vẫn đang trong hàng đợi xử lý:
     ```sql
     CREATE UNIQUE INDEX idx_content_reports_dedup_active 
         ON content_reports(reporter_id, target_type, target_id) 
         WHERE status IN ('OPEN', 'IN_REVIEW');
     ```
4. **Phân loại lý do & Chi tiết:**
   - Bổ sung `reason_category varchar(50)` chuẩn hóa: `'SPAM'`, `'INAPPROPRIATE'`, `'HARASSMENT'`, `'FALSE_INFORMATION'`, `'COPYRIGHT'`, `'VIOLENCE'`, `'OTHER'`.
   - Bổ sung `details text` cho phép người dùng nhập giải trình thêm.
   - Bổ sung `resolution_notes text` và `updated_at timestamptz` phục vụ ghi nhận kết quả xử lý của Moderator.

---

## 4. NỘI DUNG C: BẢNG `moderation_events` (SỰ KIỆN KIỂM DUYỆT)

### 4.1. Phân Tích Hiện Trạng Trong Baseline Schema
Trong baseline migration, bảng `moderation_events` có cấu trúc:
```sql
CREATE TABLE moderation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type varchar(30) NOT NULL,
    target_id uuid NOT NULL,
    rule_score numeric(5,4),
    ai_score numeric(5,4),
    reasons_json jsonb,
    action varchar(30) NOT NULL,
    reviewer_id uuid REFERENCES users(id),
    previous_status varchar(30),
    next_status varchar(30),
    created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.2. Các Điểm Bổ Sung / Cải Tiến Đề Xuất
1. **Liên kết với báo cáo (`report_id`):**
   - Bổ sung `report_id uuid REFERENCES content_reports(id) ON DELETE SET NULL`.
   - *Lý do:* Khi kiểm duyệt viên xử lý một báo cáo từ hàng đợi, sự kiện kiểm duyệt cần liên kết ngược lại báo cáo đó để phục vụ thống kê thời gian phản hồi (SLA) và truy vết nguồn gốc xử lý.
2. **Phân biệt rạch ròi với `audit_logs` của TV2:**
   - `audit_logs` (TV2 quản lý): Ghi lại các biến động quản trị hệ thống mức cao (đăng nhập thất bại, đổi mật khẩu, phân quyền role, nạp/rút tiền, thay đổi owner chuyến đi).
   - `moderation_events`: Chuyên biệt cho **vòng đời an toàn nội dung** (Content Safety Lifecycle): lưu điểm số AI toxicity scoring (`ai_score`), điểm vi phạm từ khóa nhạy cảm (`rule_score`), danh sách vi phạm (`reasons_json`), và hành vi kiểm duyệt cụ thể.
3. **Ràng buộc chuẩn hóa hành động kiểm duyệt (`action`):**
   ```sql
   CHECK (action IN (
       'AUTO_FLAG', 'AUTO_APPROVE', 'AUTO_HIDE', 
       'MANUAL_APPROVE', 'MANUAL_HIDE', 'MANUAL_RESTORE', 
       'MANUAL_DELETE', 'WARN_AUTHOR', 'DISMISS_REPORT'
   ))
   ```
4. **Bổ sung Index phục vụ trang Admin Moderation (TV1 / TV5):**
   - Index theo `(target_type, target_id, created_at DESC)` để xem lịch sử kiểm duyệt của 1 bài viết.
   - Index theo `(reviewer_id, created_at DESC)` để đánh giá năng suất làm việc của kiểm duyệt viên.

---

## 5. HƯỚNG DẪN DÀNH CHO TV2 ĐỂ TÍCH HỢP VÀO FLYWAY

Do cơ sở dữ liệu Supabase của nhóm đã chạy baseline `V202610171200__baseline_schema.sql`, tuân thủ **Quy tắc bất biến (Immutability)** trong `TEAM_CODING_RULES.md`, TV2 có thể thực hiện theo 1 trong 2 phương án:

### Phương Án Khuyên Dùng (Khuyến nghị 100%): Thêm Migration Nâng Cấp Mới
TV2 chỉ cần copy file:
`database/ddl/V202610211000__tv1_enhance_content_reports_and_moderation.sql`  
vào thư mục:  
`backend/src/main/resources/db/migration/`

Khi chạy backend (`.\gradlew.bat bootRun` hoặc `run-backend.bat`), Flyway sẽ tự động phát hiện và áp dụng các cột bổ sung, ràng buộc `CHECK` và các `INDEX` mới một cách an toàn mà không làm mất bất kỳ dữ liệu nào đã có trên Supabase.

### Phương Án Dự Phòng: Tích Hợp Thẳng Vào Baseline (Chỉ áp dụng nếu Reset DB)
Nếu nhóm quyết định reset lại database trước khi vào Tuần 2, TV2 có thể lấy trực tiếp nội dung trong file:
`database/ddl/content_reports_and_moderation_events_schema.sql`  
để thay thế định nghĩa của 2 bảng `content_reports` và `moderation_events` trong file `V202610171200__baseline_schema.sql`.

---

## 6. CÁC QUYẾT ĐỊNH CẦN THỐNG NHẤT THÊM VỚI NHÓM (OPEN QUESTIONS)

1. **Ngưỡng tự động ẩn nội dung (Auto-Hide Threshold):**
   - Đề xuất: Nếu một bài viết hoặc đánh giá nhận từ **3 báo cáo hợp lệ trở lên** từ 3 người dùng khác nhau trong vòng 24 giờ, hoặc có `ai_score >= 0.85`, hệ thống sẽ tự động chuyển trạng thái sang `HIDDEN` và tạo một `moderation_event` với action `'AUTO_HIDE'`, chờ Moderator duyệt lại.
2. **Quyền hạn xử lý báo cáo điểm đến (`target_type = 'DESTINATION'`):**
   - Đối với bài viết/bình luận (TV5): Moderator có thể duyệt ẩn/khôi phục.
   - Đối với thông tin điểm đến sai lệch (TV1): Báo cáo cần được chuyển riêng vào luồng CMS của TV1 để xác minh lại nguồn và ngày xác minh (`verified_at`).
3. **Quy tắc lưu trữ lịch sử báo cáo:**
   - Dữ liệu `content_reports` và `moderation_events` không bao giờ bị xóa cứng (`Hard Delete`), nhằm đảm bảo tính toàn vẹn kiểm toán (Audit Trail) phục vụ đánh giá an toàn nền tảng.
