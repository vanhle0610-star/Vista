# QUY TRÌNH PHÁT TRIỂN DÀNH CHO LẬP TRÌNH VIÊN (DEVELOPER WORKFLOW)

Tài liệu hướng dẫn quy chuẩn lập trình chi tiết và bộ quy tắc bắt buộc trước khi code được lưu tại:

👉 **[TEAM_CODING_RULES.md](../../TEAM_CODING_RULES.md)**

---

## TÓM TẮT QUY TRÌNH HÀNG NGÀY

1. **Buổi sáng (9:00):** Họp Standup 10 phút (Hôm qua làm gì? Hôm nay làm gì? Đang chờ ai?).
2. **Trước khi bắt đầu task:**
   - Đọc kỹ Acceptance Criteria dạng Given/When/Then trong `docs/requirements/`.
   - Kiểm tra hợp đồng API trong `contracts/openapi/openapi.yaml`.
   - Tạo nhánh đúng chuẩn từ `develop`: `feature/W<tuần>-<task_id>-<tên_task>`.
3. **Trong khi code:**
   - Backend tuân thủ Package-by-Feature, dùng DTO Java Record, không leak Entity ra ngoài.
   - Mobile tuân thủ Expo Router, TanStack Query, Zod validation, dùng design tokens.
4. **Trước khi tạo PR:**
   - Backend chạy `.\gradlew.bat spotlessApply` và `.\gradlew.bat test`.
   - Mobile chạy `npm run typecheck`, `npx eslint .`, `npm test`.
   - Điền đầy đủ PR Template và gán Reviewer theo `CODEOWNERS`.
5. **Thứ Năm chiều:** Code Freeze (ngừng nhận việc mới, chỉ sửa lỗi).
6. **Thứ Sáu:** Sáng tích hợp vào `develop`, chiều Demo chung + Chấm cổng kiểm soát tuần.

---

## HƯỚNG DẪN CẤU HÌNH GITHUB BRANCH PROTECTION (QUẢN TRỊ VIÊN)

Cấu hình Branch Protection không thể thực hiện qua lệnh Git local mà bắt buộc phải thiết lập trên giao diện Web GitHub của Repository:

1. Truy cập Repository trên GitHub: `Settings` > `Branches` > `Add classic branch protection rule` (hoặc `Rules` > `Rulesets`).
2. Nhập `Branch name pattern`: `main` và `dev` (hoặc `develop`).
3. Tích chọn các điều kiện bắt buộc:
   - **Require a pull request before merging:** Yêu cầu ít nhất 1 approval từ CODEOWNERS.
   - **Require review from Code Owners:** Bắt buộc reviewer phụ trách module phê duyệt trước khi merge.
   - **Require status checks to pass before merging:**
     - Chọn `Backend CI / build` (kiểm tra Gradle build & test).
     - Chọn `Mobile CI / check` (kiểm tra TypeScript, ESLint, Jest).
     - Chọn `Admin CI / build` (kiểm tra Next.js build).
     - Chọn `Contract CI / lint` (kiểm tra OpenAPI contract).
   - **Require branches to be up to date before merging:** Đảm bảo code được rebase/merge mới nhất từ nhánh đích.
   - **Do not allow bypassing the above settings:** Áp dụng cho cả Administrators.
