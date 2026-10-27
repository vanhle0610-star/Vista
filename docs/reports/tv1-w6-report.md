# BÁO CÁO TRIỂN KHAI TUẦN 6 — THÀNH VIÊN 1 (TV1)
**Vai trò:** TV1 — Guest / Visitor, Destination Discovery & Mobile Lead  
**Dự án:** VISTA — Nền tảng Hỗ trợ Du lịch Thông minh  
**Branch làm việc:** `feature/son-tv1/tuan3-4-destination-discovery`  
**Trạng thái Git:** Chỉ lưu trên local working tree (KHÔNG COMMIT, KHÔNG PUSH theo đúng yêu cầu)  

---

## 1. Mục tiêu và Phạm vi Tuần 6 của TV1

Căn cứ theo SRS (Yêu cầu FR-ADM-01 & FR-ADM-03), tài liệu kiến trúc kỹ thuật và kế hoạch phát triển:
- **Trọng tâm Tuần 6:** Xây dựng hệ thống **Hàng đợi kiểm duyệt điểm đến (Destination Moderation Queue)** và luồng **Phê duyệt / Từ chối nội dung (Destination Approval Flow)** trên Web Admin.
- **Backend (Spring Boot):**
  - Mở rộng phân quyền Spring Security cho phép cả vai trò `ADMIN` và `MODERATOR` truy cập tài nguyên quản trị kiểm duyệt (`/api/v1/admin/**`).
  - Mở rộng lớp `UserPrincipal` cung cấp `isModerator()` và `isModeratorOrAdmin()`.
  - Thiết kế DTO `DestinationStatusUpdateRequest` phục vụ cập nhật trạng thái kèm lý do/ghi chú kiểm duyệt.
  - Nâng cấp `DestinationService` bổ sung các hàm nghiệp vụ:
    - Tra cứu hàng đợi kiểm duyệt (`searchModerationQueue`) hỗ trợ lọc theo trạng thái (`DRAFT`, `PUBLISHED`, `REJECTED`, `ALL`), từ khóa, tỉnh thành, thể loại.
    - Xem chi tiết quản trị (`getDestinationAdminDetail`) cho phép xem nội dung ở mọi trạng thái.
    - Cập nhật trạng thái (`updateDestinationStatus`, `approveDestination`, `rejectDestination`), tự động cập nhật mốc thời gian xác minh `verifiedAt` khi xuất bản và tích hợp `AuditLogService` ghi nhật ký kiểm duyệt.
    - Thống kê hàng đợi (`getModerationStats`) trả về số lượng theo từng trạng thái.
  - Xây dựng REST Controller `AdminDestinationController` cung cấp bộ API chuẩn RESTful tại `/api/v1/admin/destinations`.
  - Đảm bảo tính cô lập dữ liệu: Các điểm đến ở trạng thái `DRAFT` và `REJECTED` tuyệt đối không bị lộ ra API công khai `/api/v1/destinations` hoặc màn hình Khám phá Mobile (Mobile Discovery).
- **Frontend Web (Next.js App Router):**
  - Triển khai giao diện hoàn chỉnh tại `web/src/app/(protected)/moderation/page.tsx` và `moderation.module.css`.
  - Hiển thị 4 thẻ thống kê số lượng điểm đến theo trạng thái trực quan (DRAFT, PUBLISHED, REJECTED, ALL).
  - Thanh bộ lọc trạng thái dạng Tab tương tác mượt mà kết hợp ô tìm kiếm theo tên và bộ lọc theo tỉnh thành.
  - Bảng danh sách hàng đợi trực quan với ảnh thumbnail, phân loại, giá vé, tọa độ, huy hiệu trạng thái (status badge).
  - Modal kiểm định chi tiết (Full Inspection Modal): Xem ảnh lớn, mô tả đầy đủ, tọa độ GPS, khung giờ mở cửa chi tiết 7 ngày trong tuần (`mon` -> `sun`), đường dẫn nguồn tham khảo.
  - Thao tác nhanh: Nút "Xem chi tiết", "Duyệt" (`PUBLISHED`) và "Từ chối" (`REJECTED`) với xử lý loading, vô hiệu hóa nút tránh bấm đúp, và hiển thị Toast thông báo kết quả.
  - Xử lý các trạng thái: Đang tải dữ liệu (Loading skeleton/spinner), Dữ liệu rỗng (Empty state), Lỗi kết nối API, và Phân quyền truy cập (thông báo lỗi rõ ràng khi không có quyền `ADMIN` hoặc `MODERATOR`).
  - Tích hợp điều hướng hai chiều giữa Trang Quản lý điểm đến (`/destinations`) và Trang Hàng đợi kiểm duyệt (`/moderation`).
- **Kiểm thử tự động:**
  - Viết bộ kiểm thử tích hợp chuyên sâu `DestinationModerationIntegrationTest` xác minh đầy đủ 5 kịch bản kiểm duyệt (W6-MOD-01 đến W6-MOD-05).

---

## 2. Kết quả triển khai kỹ thuật

### A. Backend: Phân quyền, Nghiệp vụ & API Kiểm duyệt
1. **Mở rộng Phân quyền Spring Security:**
   - File: `backend/src/main/java/com/vista/common/security/SecurityConfiguration.java`
   - Cập nhật rule:
     ```java
     .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "MODERATOR")
     ```
   - Cho phép tài khoản có quyền `MODERATOR` thực hiện nghiệp vụ kiểm duyệt điểm đến mà không cần cấp quyền quản trị hệ thống tối cao (`ADMIN`).
   - File: `backend/src/main/java/com/vista/common/security/UserPrincipal.java`
   - Bổ sung các phương thức tiện ích `isModerator()` và `isModeratorOrAdmin()`.

2. **DTO Cập nhật Trạng thái:**
   - File: `backend/src/main/java/com/vista/destination/api/dto/DestinationStatusUpdateRequest.java`
   - Hỗ trợ các trường: `status` (`DRAFT`, `PUBLISHED`, `REJECTED`), `moderatorId`, `note`.

3. **Nâng cấp `DestinationService`:**
   - File: `backend/src/main/java/com/vista/destination/service/DestinationService.java`
   - Định nghĩa các hằng số chuẩn: `STATUS_DRAFT = "DRAFT"`, `STATUS_PUBLISHED = "PUBLISHED"`, `STATUS_REJECTED = "REJECTED"`.
   - Bổ sung `auditLogService` (tiêm phụ thuộc tùy chọn `@Autowired(required = false)` để tương thích với module của TV2).
   - Bổ sung `searchModerationQueue(status, keyword, province, category, page, size)`: Tìm kiếm toàn diện trong kho dữ liệu phục vụ quản trị viên, hỗ trợ xem cả danh sách chờ duyệt, đã duyệt, hoặc đã từ chối.
   - Bổ sung `getDestinationAdminDetail(id)`: Lấy đầy đủ thông tin điểm đến bất kể trạng thái hiện tại.
   - Bổ sung `updateDestinationStatus(id, targetStatus, moderatorId, note)`: Kiểm tra hợp lệ trạng thái, gán `verifiedAt` khi duyệt xuất bản, lưu DB và ghi log thông qua `AuditLogService.logAction(moderatorId, "DESTINATION_PUBLISHED" | "DESTINATION_REJECTED", ...)`.
   - Bổ sung `approveDestination(id, moderatorId, note)` và `rejectDestination(id, moderatorId, note)`.
   - Bổ sung `getModerationStats()`: Trả về thống kê tổng số, số điểm đến draft, published, rejected.

4. **Xây dựng `AdminDestinationController`:**
   - File: `backend/src/main/java/com/vista/destination/api/AdminDestinationController.java`
   - Base path: `/api/v1/admin/destinations`
   - Bảo mật: `@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")` và `@SecurityRequirement(name = "bearerAuth")`.
   - Endpoints cung cấp:
     - `GET /api/v1/admin/destinations`: Lấy danh sách hàng đợi phân trang, hỗ trợ filter `status`, `keyword`, `province`, `category`.
     - `GET /api/v1/admin/destinations/stats`: Lấy thống kê số lượng theo trạng thái.
     - `GET /api/v1/admin/destinations/{id}`: Xem chi tiết thông tin kiểm định điểm đến.
     - `PUT /api/v1/admin/destinations/{id}/approve`: Duyệt và xuất bản điểm đến sang trạng thái `PUBLISHED`.
     - `PUT /api/v1/admin/destinations/{id}/reject`: Từ chối xuất bản điểm đến, chuyển sang `REJECTED`.
     - `PUT /api/v1/admin/destinations/{id}/status`: Cập nhật trạng thái tùy chỉnh với ghi chú.

---

### B. Frontend Web: Console Kiểm duyệt Hoàn chỉnh (`/moderation`)
1. **Module CSS Giao diện Chuyên nghiệp (`moderation.module.css`):**
   - Thiết kế chuẩn thẩm mỹ hiện đại với thẻ thống kê (Stats Cards), bộ lọc Tab sinh động, bảng dữ liệu responsive, modal thẩm định chi tiết với backdrop làm mờ (glassmorphism), và Toast thông báo thao tác.
2. **Giao diện Quản trị (`moderation/page.tsx`):**
   - **Thống kê thời gian thực:** Hiển thị 4 thẻ thống kê: Tổng địa điểm, Chờ duyệt (`DRAFT`), Đã duyệt (`PUBLISHED`), Từ chối (`REJECTED`).
   - **Bộ lọc & Tìm kiếm:** Tabs chuyển đổi trạng thái tức thì, thanh tìm kiếm từ khóa theo tên điểm đến, dropdown chọn tỉnh thành.
   - **Bảng dữ liệu hàng đợi:** Hiển thị hình ảnh thumbnail, tên điểm đến, ID rút gọn, tỉnh thành, thể loại, khoảng giá, tọa độ GPS và badge trạng thái có màu sắc nhận diện rõ ràng.
   - **Modal kiểm định chi tiết:**
     - Ảnh hero kích thước lớn kiểm tra chất lượng hình ảnh.
     - Mô tả chi tiết nội dung điểm đến.
     - Lịch hoạt động 7 ngày trong tuần được phân tách rõ ràng từng ngày (`mon` -> `sun`) với nhãn tiếng Việt (`Thứ Hai` đến `Chủ Nhật`).
     - Tọa độ GPS kinh độ / vĩ độ và đường dẫn nguồn tham khảo.
     - Hai nút hành động trực tiếp trong Modal: "Từ chối" và "Phê duyệt & Xuất bản".
   - **Trải nghiệm người dùng (UX):**
     - Loading skeleton mượt mà.
     - Empty state thân thiện khi không có điểm đến nào trong hàng đợi.
     - Báo lỗi quyền truy cập (401/403) hướng dẫn người dùng đăng nhập với tài khoản có quyền `ADMIN` hoặc `MODERATOR`.
     - Vô hiệu hóa nút và hiển thị spinner khi đang thực hiện thao tác duyệt/từ chối, ngăn chặn tình trạng bấm liên tiếp.
     - Toast thông báo kết quả thao tác tự động ẩn sau 4 giây.
3. **Liên kết điều hướng tại `/destinations`:**
   - Bổ sung nút liên kết trực tiếp "🛡️ Kiểm duyệt điểm đến" trên thanh công cụ của trang Quản lý Điểm đến Du lịch CMS.
   - Cập nhật hiển thị màu sắc badge trạng thái thống nhất giữa hai trang.

---

## 3. Danh sách kiểm thử & Kết quả xác minh

| STT | Bài kiểm thử / Lệnh | Mô tả kịch bản kiểm tra | Kết quả thực tế |
|---|---|---|---|
| 1 | `DestinationModerationIntegrationTest` | Kiểm tra toàn diện luồng duyệt điểm đến: Tra cứu hàng đợi, Lọc theo trạng thái `DRAFT`/`PUBLISHED`/`REJECTED`, Thống kê stats, Xem chi tiết, Duyệt sang `PUBLISHED`, Từ chối sang `REJECTED`, Cô lập dữ liệu không lộ ra ngoài public API | **PASS (100%)** |
| 2 | `DestinationWeek5IntegrationTest` | Ràng buộc giá vé `priceMax`, bảo toàn JSON giờ mở cửa 7 ngày cho AI Planner, Stub service | **PASS (100%)** |
| 3 | `DestinationServiceTest` | Logic nghiệp vụ service Destination | **PASS (100%)** |
| 4 | `DestinationQueryServiceTest` | Contract tra cứu điểm đến công khai | **PASS (100%)** |
| 5 | `DestinationIntegrationFlowTest` | Luồng tương tác Visitor (Search -> Detail -> Favorite -> History) | **PASS (100%)** |
| 6 | `SecurityAuthorizationTest` | Kiểm tra phân quyền truy cập và bảo mật RBAC | **PASS (100%)** |
| 7 | Web Typecheck (`npm run typecheck` tại `web/`) | Kiểm tra kiểu TypeScript toàn bộ ứng dụng Web Next.js | **PASS (0 lỗi)** |
| 8 | Web Lint (`npx eslint` trên các file Tuần 6) | Kiểm tra tuân thủ coding standards và React 19 rules | **PASS (0 lỗi)** |
| 9 | Mobile Typecheck (`npm run typecheck` tại `mobile/`) | Kiểm tra kiểu TypeScript ứng dụng Mobile Expo/React Native | **PASS (0 lỗi)** |
| 10 | Mobile Jest Tests (`npm test` tại `mobile/`) | 14 test suites liên quan đến Discovery, Map, Timeline, Budget | **PASS (49/49 tests)** |

---

## 4. Tương thích chéo (Cross-Actor Integration)

1. **Với TV2 (Auth & Audit Log):**
   - API kiểm duyệt tích hợp với `AuditLogService` của TV2 thông qua cơ chế loosely coupled (tùy chọn tiêm phụ thuộc). Khi duyệt/từ chối, hệ thống tự động ghi nhật ký kiểm duyệt vào bảng audit log với actor ID và chi tiết thao tác.
   - Phân quyền Spring Security mở rộng cho `MODERATOR` hoàn toàn tương thích với bảng `users` và enum `Role` trong DB của TV2.
2. **Với TV3 (Map & Stop Proposals):**
   - Các điểm đến sau khi được duyệt (`status = 'PUBLISHED'`) lập tức xuất hiện trên bản đồ vệ tinh MapLibre của TV3 và sẵn sàng được thêm vào các đề xuất điểm dừng lịch trình (Itinerary Stops).
   - Điểm đến chưa duyệt (`DRAFT`, `REJECTED`) được cô lập an toàn, không làm sai lệch dữ liệu bản đồ.
3. **Với TV4 (AI Planner):**
   - Quy trình kiểm định đảm bảo giờ mở cửa 7 ngày và giá vé được xác minh đầy đủ trước khi xuất bản, giúp AI Planner tính toán lịch trình chính xác và khả thi.

---

## 5. Quy tắc Git & Trạng thái Working Tree

- **Cam kết tuân thủ nghiêm ngặt:**
  - Tuyệt đối **KHÔNG tạo commit** nào trong phiên làm việc này.
  - Tuyệt đối **KHÔNG push**, **KHÔNG merge**, **KHÔNG rebase**, **KHÔNG đổi branch**.
  - Toàn bộ công việc của Tuần 5 và Tuần 6 được lưu trữ nguyên vẹn trên local working tree của branch `feature/son-tv1/tuan3-4-destination-discovery`.
  - Sẵn sàng bàn giao cho người dùng kiểm tra trực quan trước khi thực hiện commit gộp chung cho Tuần 5 và Tuần 6 theo chỉ đạo.
