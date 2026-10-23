# BIÊN BẢN CỔNG KIỂM SOÁT #1 (GATE REVIEW #1 — MID-TERM GATE)
## ACTOR: GUEST / VISITOR & DESTINATION LEAD (TV1)

> **Dự án:** VISTA — Vietnam Travel Discovery & Collaborative Trip Planning Platform  
> **Thành viên phụ trách:** TV1 (Guest / Visitor — Destination Discovery & Mobile Lead)  
> **Thời điểm đánh giá:** Tuần 4 (W4) — Cổng kiểm soát giữa kỳ (Mid-term Gate)  
> **Nhánh phát triển:** `feature/tv1-destination-discovery-week3`  
> **Tài liệu căn cứ:** [actor-implementation-plan-8weeks.md](file:///docs/requirements/actor-implementation-plan-8weeks.md)

---

## 1. PHẠM VI NGHIỆM THU (SCOPE OF REVIEW)

Trong giai đoạn từ Tuần 1 đến hết Tuần 4, TV1 chịu trách nhiệm các hạng mục:
1. **Khám phá điểm đến (Destination Discovery):**
   - Tìm kiếm điểm đến (hỗ trợ có dấu và không dấu).
   - Bộ lọc theo tỉnh/thành phố và phân loại danh mục du lịch.
   - Chi tiết điểm đến (Destination Detail): Tên, tọa độ, mô tả, khoảng giá, giờ mở cửa có cấu trúc, ảnh và nguồn kiểm chứng.
   - Danh sách yêu thích (Favorites): Lưu, bỏ lưu, xem danh sách.
   - Lịch sử xem (Recently Viewed History): Tự động ghi nhận lượt xem khi mở trang chi tiết.
2. **Khung ứng dụng di động dùng chung (Mobile Foundation):**
   - Bộ khung Expo Router, theme tokens, typography, component thẻ điểm đến, header, bộ lọc chip.
   - Cơ chế lưu trữ kép (Dual Storage): Lưu trữ cục bộ qua AsyncStorage cho khách vãng lai (Guest); Đồng bộ bảo mật qua REST API / Supabase khi đã đăng nhập (Member).
3. **Bộ dữ liệu điểm đến hạt giống (Seed Data):**
   - Đạt tối thiểu 90 điểm đến hợp lệ trải dài 10 tỉnh/thành trọng điểm du lịch Việt Nam.
   - Đảm bảo 100% điểm đến có tọa độ GPS nằm trong lãnh thổ Việt Nam, URL nguồn thực tế, và giờ mở cửa 7 ngày chuẩn JSON phục vụ AI.
4. **Hợp đồng tích hợp liên-Actor (Public Service Contract):**
   - Interface `DestinationQueryService` và DTO `DestinationSummary` cung cấp cho TV3 (Itinerary Stop) và TV4 (Budget & AI Planner).
   - Bản giả lập `StubDestinationQueryService` hỗ trợ in-memory testing độc lập không cần database.

---

## 2. MA TRẬN TRUY XUẤT YÊU CẦU & KIỂM THỬ (TRACEABILITY MATRIX)

| Mã Use Case | Yêu cầu nghiệp vụ | Mã Test Case | Hạng mục kiểm thử | Môi trường kiểm thử | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **BF-01** / FR-DEST-01 | Tìm kiếm điểm đến theo từ khóa | `TC-DEST-01` | Tìm kiếm theo tên hoặc mô tả, phân trang, keyword trống | Unit Test + Integration Test | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-02 | Lọc điểm đến theo Tỉnh/Thành | `TC-DEST-02` | Lọc theo 10 tỉnh/thành phố du lịch chính | Unit Test + Integration Test | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-04 | Xem chi tiết điểm đến hợp lệ | `TC-DEST-03` | Trả về đủ 12 trường dữ liệu, giờ mở cửa map, isFavorite flag | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-04 | Xử lý điểm đến không tồn tại | `TC-DEST-04` | Trả về Problem Detail 404 DESTINATION_NOT_FOUND | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-05 | Đánh dấu yêu thích (Member) | `TC-DEST-05` | PUT/POST `/favorite` trả về 204 No Content, chống duplicate | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-05 | Bỏ đánh dấu yêu thích (Member) | `TC-DEST-06` | DELETE `/favorite` trả về 204 No Content, xóa khỏi DB | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-05 | Lấy danh sách yêu thích (Member) | `TC-DEST-07` | GET `/favorites` trả về danh sách điểm đến đã PUBLISHED | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-05 | Yêu thích và Lịch sử (Guest) | `TC-DEST-08` | Lưu cục bộ trên thiết bị qua AsyncStorage không cần token | Mobile Typecheck & Unit Spec | <span style="color:green">**PASS**</span> |
| **BF-01** / FR-DEST-06 | Ghi nhận lịch sử xem điểm đến | `TC-DEST-09` | POST `/history` cập nhật viewedAt, không duplicate bản ghi | WebMvcTest + ServiceTest | <span style="color:green">**PASS**</span> |
| **W1-W4** / Seed Data | Chuẩn hóa ≥ 90 điểm đến | `TC-DATA-01` | 90 bản ghi qua validator tọa độ, giá vé, nguồn, giờ mở cửa | Validator Script + Java Test | <span style="color:green">**PASS**</span> |
| **W4-AI** / Data Schema | Giờ mở cửa 7 ngày cho AI | `TC-DATA-02` | 100% bản ghi có JSON 7 ngày hợp lệ (`mon`..`sun`) | OpeningHoursValidationTest | <span style="color:green">**PASS**</span> |
| **W3-Contract** / TV3 | Thêm điểm dừng và nạp lịch trình | `TC-INT-TV3` | `findPublishedById`, `findPublishedByIds`, `isPublished` | IntegrationFlowTest + StubTest | <span style="color:green">**PASS**</span> |
| **W3-Contract** / TV4 | Cung cấp ứng viên điểm đến cho AI | `TC-INT-TV4` | `searchPublished`, tính toán giá vé `priceMin`/`priceMax` | IntegrationFlowTest + StubTest | <span style="color:green">**PASS**</span> |

---

## 3. CHI TIẾT CÁC TEST CASE ĐÃ THỰC THI (TEST EXECUTION EVIDENCE)

### TC-DEST-01 đến TC-DEST-07: Backend Web Slice & Service Unit Tests
* **Lệnh thực thi:**
  ```bash
  ./gradlew test --tests "com.vista.destination.api.DestinationControllerTest"
  ./gradlew test --tests "com.vista.destination.service.DestinationServiceTest"
  ```
* **Kết quả:** 100% Pass (8/8 Controller tests, 10/10 Service tests).
* **Bằng chứng xác thực:**
  - `addFavorite`: Đảm bảo tính idempotent, không tạo trùng dòng trong bảng `favorites` khi bấm tim nhiều lần.
  - `removeFavorite`: Bắn 404 nếu địa điểm không tồn tại; xóa đúng favorite của người dùng hiện tại, không xóa nhầm của người khác.
  - `getFavorites`: Tự động loại bỏ các điểm đến chưa được duyệt hoặc bị gỡ bỏ (`status != 'PUBLISHED'`).

### TC-DATA-01 & TC-DATA-02: Kiểm định Dữ liệu Hạt giống (Seed Integrity)
* **Lệnh thực thi:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\validate_destinations_csv.ps1
  ./gradlew test --tests "com.vista.destination.domain.OpeningHoursValidationTest"
  ```
* **Kết quả:**
  - Script PowerShell xác nhận: `ALL 90 RECORDS PASSED ALL INTEGRITY & VALIDATION TESTS!`.
  - Phân bổ 10 tỉnh/thành phố: Đà Nẵng (10), Huế (10), Quảng Nam (10), Hà Nội (10), Hồ Chí Minh (10), Lâm Đồng (5), Quảng Ninh (5), Hải Phòng (10), Cần Thơ (10), Ninh Bình (10).
  - Tọa độ GPS: 100% nằm trong biên giới Việt Nam ($8.0^\circ \le \text{lat} \le 24.0^\circ$, $102.0^\circ \le \text{lng} \le 110.0^\circ$).
  - Giờ mở cửa: 100% (90/90 điểm đến) có cấu trúc JSON đầy đủ 7 ngày (`mon` đến `sun`), hỗ trợ cả trường hợp mở cửa 24/7 (`00:00-23:59`) và đóng cửa (`closed`).

### TC-INT-TV3 & TC-INT-TV4: Kiểm thử Hợp đồng Tích hợp Liên Actor
* **Lệnh thực thi:**
  ```bash
  ./gradlew test --tests "com.vista.destination.integration.DestinationIntegrationFlowTest"
  ./gradlew test --tests "com.vista.destination.application.DestinationQueryServiceTest"
  ```
* **Kết quả:**
  - `DestinationQueryServiceTest`: 5/5 tests Pass.
  - `DestinationIntegrationFlowTest`: 4/4 tests Pass.
  - `StubDestinationQueryService` xác nhận hoạt động độc lập in-memory hoàn hảo: hỗ trợ `addDestination`, `removeDestination`, `clear`, `findPublishedByIds` cho TV3/TV4 viết unit test mà không cần kết nối cơ sở dữ liệu thật.

### TC-MOBILE-01: Kiểm tra Biên dịch & Kiểu dữ liệu Ứng dụng Di động
* **Lệnh thực thi:**
  ```bash
  cd mobile && npm run typecheck
  npx eslint src/features/discovery src/features/favorites "src/app/destination/[id].tsx" "src/app/(tabs)/profile.tsx" src/services/api/destinationApi.ts
  ```
* **Kết quả:**
  - `tsc --noEmit`: 0 lỗi biên dịch TypeScript.
  - ESLint trên các file TV1: 0 lỗi, 0 cảnh báo.

---

## 4. HẠN CHẾ MÔI TRƯỜNG & HẠNG MỤC MANUAL TEST (KNOWN LIMITATIONS)

1. **Môi trường thiết bị thật (Physical Device / Android Emulator):**
   - Công cụ dòng lệnh `adb` không khả dụng trong môi trường container/shell hiện tại, do đó chưa thể cắm cáp USB chạy tự động APK lên thiết bị vật lý.
   - Đã thực hiện kiểm định thay thế bằng: TypeScript Compiler (`tsc`), Static Analysis (ESLint), và Mock HTTP/AsyncStorage integration logic.
2. **Kế hoạch kiểm thử thủ công trên thiết bị Expo Go:**
   - [ ] Mở ứng dụng trên Expo Go (Android & iOS).
   - [ ] Nhập "cà phê" vào thanh tìm kiếm ➔ Kiểm tra bàn phím ảo không che mất danh sách kết quả.
   - [ ] Vuốt ngang bộ lọc Tỉnh/Thành ➔ Chọn "Ninh Bình" ➔ Kiểm tra danh sách hiển thị đúng 10 địa điểm.
   - [ ] Chạm vào biểu tượng tim ở thẻ ngoài ➔ Kiểm tra tim đổi màu đỏ ngay lập tức (không delay giật lag).
   - [ ] Mở tab Profile ➔ Kiểm tra tab "Yêu thích" và "Đã xem gần đây" hiển thị đồng bộ.
   - [ ] Tắt WiFi/4G ➔ Kiểm tra thông báo lỗi mạng nhẹ nhàng và nút "Thử lại".

---

## 5. PHỤ THUỘC TỪ CÁC THÀNH VIÊN KHÁC (CROSS-ACTOR DEPENDENCIES)

1. **TV2 (Authentication & User Profile):**
   - Cơ chế bảo mật JWT Bearer Token của TV2 cấp sau khi đăng nhập được `useFavorites` và `useDestinationHistory` tự động bắt qua `storage.getItem('vista_token')`.
   - Khi chưa có token (Guest), hệ thống tự động fallback 100% về `AsyncStorage` cục bộ.
2. **TV3 (Itinerary Stop):**
   - TV3 đã được bàn giao interface `DestinationQueryService` và `StubDestinationQueryService` cùng tài liệu hướng dẫn chi tiết tại [handover-tv1-tv3-tv4-w3.md](file:///docs/architecture/handover-tv1-tv3-tv4-w3.md). TV3 có thể inject service để lưu điểm dừng lịch trình ngay lập tức.
3. **TV4 (AI Planner & Budget):**
   - TV4 có thể gọi `destinationQueryService.searchPublished(...)` để nạp danh sách địa điểm thật có giờ mở cửa chuẩn 7 ngày và giá vé vào prompt context của Gemini AI.

---

## 6. KẾT LUẬN CỦA CỔNG KIỂM SOÁT #1

* **Đánh giá tổng thể của TV1:** <span style="color:green; font-weight:bold;">ĐẠT (PASS)</span> cho toàn bộ các tiêu chí nghiệm thu Tuần 1, Tuần 2, Tuần 3 và Tuần 4.
* Không có blocker kỹ thuật nào thuộc phạm vi TV1 cản trở tiến độ của nhóm.
* Sẵn sàng chuyển giao sang Tuần 5 (Rà soát chất lượng dữ liệu AI) và Tuần 6 (Web Admin kiểm duyệt nội dung).
