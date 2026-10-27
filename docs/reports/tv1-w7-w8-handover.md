# TV1 — Báo Cáo Triển Khai & Biên Bản Bàn Giao Tuần 7–8
## ACTOR: GUEST / VISITOR & DESTINATION LEAD (TV1)

> **Dự án:** VISTA — Vietnam Travel Discovery & Collaborative Trip Planning Platform
> **Thành viên phụ trách:** TV1 (Guest / Visitor — Destination Discovery & Mobile Lead)
> **Thời điểm đánh giá:** Tuần 8 (W8) — Giai đoạn đóng băng mã nguồn (Code Freeze) & Bàn giao
> **Nhánh phát triển:** `feature/son-tv1/tuan7-8-destination`
> **Tài liệu căn cứ:** [actor-implementation-plan-8weeks.md](file:///docs/requirements/actor-implementation-plan-8weeks.md), [tv1-gate-review-1.md](file:///docs/testing/tv1-gate-review-1.md)

---

## 1. PHẠM VI VÀ VAI TRÒ (SCOPE & ROLE)

TV1 chịu trách nhiệm toàn diện về:
1. **Khám phá Điểm đến Du lịch (Destination Discovery):** Tìm kiếm điểm đến (hỗ trợ tiếng Việt có dấu và không dấu qua slug tokens), lọc đa tiêu chí (Tỉnh/Thành, Thể loại, Mức giá tối đa, Vé 0đ), chi tiết điểm đến kèm tọa độ GPS, khoảng giá và giờ mở cửa 7 ngày có cấu trúc JSON cho AI.
2. **Quản lý Yêu thích & Lịch sử (Favorites & History):** Cơ chế lưu trữ kép (Dual Storage): AsyncStorage cho khách vãng lai (Guest); đồng bộ REST API cho thành viên (Member).
3. **Kiểm duyệt & Quản trị Điểm đến (Destination Moderation & Management):** Web Admin Next.js 14 cho Admin/Moderator: Hàng đợi duyệt điểm đến (`PENDING`), thao tác phê duyệt (`PUBLISHED`), từ chối có lý do (`REJECTED`), quản lý danh sách địa danh và đồng bộ ảnh Cloud Storage.
4. **Hợp đồng Tích hợp Liên-Actor (Cross-Module Contract):** Cung cấp `DestinationQueryService` (bản thật JPA và bản giả lập `StubDestinationQueryService` in-memory) phục vụ TV3 (Thêm điểm dừng lịch trình) và TV4 (Gợi ý điểm đến cho AI Planner & dự toán ngân sách).
5. **Khung ứng dụng di động dùng chung (Mobile Foundation):** Cấu trúc Expo Router, Design System Tokens, Theme màu, Typography, AppText, AppButton, ScreenContainer và Error/Loading/Empty states.
6. **Bộ dữ liệu điểm đến hạt giống (Seed Data):** Quản lý và thẩm định 350 điểm đến trải dài trên 35+ tỉnh thành toàn quốc đạt chuẩn 100% tọa độ GPS, URL nguồn kiểm chứng và giờ mở cửa 7 ngày.

---

## 2. MA TRẬN TỔNG KẾT TÍNH NĂNG HOÀN THÀNH (TUẦN 1 ĐẾN TUẦN 8)

| Giai đoạn | Mã tính năng | Hạng mục công việc đã hoàn thành | Nền tảng | Trạng thái |
|:---|:---|:---|:---:|:---:|
| **W1–W2** | `FR-MOB-01` | Khởi tạo khung Mobile Expo Router, Theme Tokens, Navigation, ScreenContainer | Mobile | **HOÀN THÀNH** |
| **W1–W2** | `FR-DEST-01` | API tìm kiếm danh sách điểm đến cơ bản, phân trang `{items, page, size, total}` | Backend | **HOÀN THÀNH** |
| **W1–W2** | `FR-DATA-01` | Nạp đợt 1 bộ dữ liệu hạt giống 60 điểm đến du lịch trọng điểm Việt Nam | DB / Seed | **HOÀN THÀNH** |
| **W1–W2** | `FR-API-01` | Bộ Postman Collection kiểm thử tự động 7 kịch bản API công khai | API / Docs | **HOÀN THÀNH** |
| **W3–W4** | `FR-DEST-02` | Bộ lọc Tỉnh/Thành phố (10 tỉnh du lịch chính) và Danh mục (Văn hóa, Biển, Nghỉ dưỡng...) | Backend / Mobile | **HOÀN THÀNH** |
| **W3–W4** | `FR-DEST-03` | Chi tiết điểm đến: 12 trường dữ liệu, GPS, liên kết nguồn, giờ mở cửa 7 ngày chuẩn JSON | Backend / Mobile | **HOÀN THÀNH** |
| **W3–W4** | `FR-FAV-01` | Danh sách yêu thích: Dual Storage (AsyncStorage cho Guest; REST API cho Member) | Backend / Mobile | **HOÀN THÀNH** |
| **W3–W4** | `FR-HIST-01` | Tự động ghi nhận lịch sử xem điểm đến khi mở trang chi tiết, chống trùng lặp | Backend / Mobile | **HOÀN THÀNH** |
| **W3–W4** | `FR-DATA-02` | Mở rộng bộ dữ liệu hạt giống lên ≥ 90 (thực tế đạt 350) điểm đến đạt chuẩn xác thực GPS | DB / Seed | **HOÀN THÀNH** |
| **W3–W4** | `FR-SRV-01` | Hợp đồng liên-Actor `DestinationQueryService` (JPA) và `StubDestinationQueryService` (In-Memory) | Backend / Contract | **HOÀN THÀNH** |
| **W5–W6** | `FR-FLT-01` | Mở rộng bộ lọc mức giá vé tối đa (`priceMax`) trên Mobile và Backend Specification | Backend / Mobile | **HOÀN THÀNH** |
| **W5–W6** | `FR-ADM-01` | Web Admin Next.js: Trang Quản lý điểm đến (`/destinations`), Form thêm mới, Upload ảnh Cloud | Web Admin | **HOÀN THÀNH** |
| **W5–W6** | `FR-ADM-02` | Web Admin Next.js: Trang Hàng đợi kiểm duyệt (`/moderation`), Bộ lọc trạng thái duyệt | Web Admin | **HOÀN THÀNH** |
| **W5–W6** | `FR-ADM-03` | Backend REST API Kiểm duyệt: Phê duyệt (`PUBLISHED`), Từ chối (`REJECTED`) kèm lý do | Backend | **HOÀN THÀNH** |
| **W7** | `FR-SRCH-01` | Tìm kiếm tiếng Việt không dấu (`da nang`, `hoi an`, `chua cau`, `ba na`, `vinh ha long`) | Backend / Contract | **HOÀN THÀNH** |
| **W7** | `SEC-DEST-01` | Cô lập an toàn dữ liệu công khai: Điểm đến `DRAFT`/`REJECTED` ném 404, không rò rỉ trên Search | Backend / API | **HOÀN THÀNH** |
| **W7** | `REG-ALL-01` | Kiểm thử hồi quy toàn diện 13 test suites (78 tests) + 8 auth tests + 11 mobile tests | Toàn hệ thống | **HOÀN THÀNH** |
| **W8** | `DOC-DEMO-01` | Hoàn thiện biên bản bàn giao, kịch bản demo 5 phút, xác minh code freeze | Tài liệu / Demo | **HOÀN THÀNH** |

---

## 3. DANH MỤC MÃ NGUỒN VÀ MODULE CHÍNH THỰC HIỆN

### 3.1. Backend (Spring Boot 4 / Java 17)
- `backend/src/main/java/com/vista/destination/service/DestinationService.java`: Dịch vụ nghiệp vụ lõi tìm kiếm (có dấu + không dấu), lọc Specification, chi tiết điểm đến, kiểm duyệt duyệt/từ chối, yêu thích và lịch sử.
- `backend/src/main/java/com/vista/destination/api/DestinationController.java`: REST API công khai và thành viên (`/api/v1/destinations`, `/favorites`, `/history`).
- `backend/src/main/java/com/vista/destination/api/AdminDestinationController.java`: REST API bảo mật cho Admin/Moderator (`/api/v1/admin/destinations/**`).
- `backend/src/main/java/com/vista/destination/application/DestinationQueryService.java`: Interface hợp đồng liên-Actor cho TV3 và TV4.
- `backend/src/main/java/com/vista/destination/application/DestinationQueryServiceImpl.java`: Hiện thực JPA cho `DestinationQueryService`.
- `backend/src/main/java/com/vista/destination/application/StubDestinationQueryService.java`: Giả lập in-memory phục vụ test độc lập của TV3/TV4.
- `backend/src/main/java/com/vista/destination/domain/Destination.java`: Entity JPA điểm đến với validation và openingHours dạng JSON.
- `backend/src/test/java/com/vista/destination/integration/DestinationWeek7RegressionTest.java`: Bộ 23 kiểm thử hồi quy mới cho tìm kiếm không dấu, bộ lọc nhạy và cô lập dữ liệu.

### 3.2. Mobile App (React Native / Expo Router)
- `mobile/src/features/discovery/screens/DiscoverScreen.tsx`: Màn hình khám phá điểm đến chính, thanh tìm kiếm từ khóa, chip bộ lọc tỉnh/danh mục/giá, thanh trạng thái bộ lọc đang kích hoạt, lưới hiển thị thẻ điểm đến, Empty/Error states và nút Đặt lại bộ lọc.
- `mobile/src/features/discovery/__tests__/DiscoverScreen.test.tsx`: Bộ 11 unit test bao phủ toàn bộ luồng hiển thị, lọc, tìm kiếm không dấu, ký tự đặc biệt, vé 0đ và xử lý lỗi mạng retry.
- `mobile/src/features/favorites/`: Hook `useFavorites` quản lý lưu trữ kép (AsyncStorage + API).
- `mobile/src/components/layout/ScreenContainer.tsx`: Khung màn hình chuẩn dùng chung.
- `mobile/src/components/feedback/States.tsx`: LoadingState, EmptyState, ErrorState.

### 3.3. Web Admin (Next.js 14 App Router)
- `web/src/app/(protected)/destinations/page.tsx`: Quản lý danh mục điểm đến, bảng dữ liệu, tìm kiếm, modal tạo mới điểm đến kèm upload ảnh Cloud.
- `web/src/app/(protected)/moderation/page.tsx`: Hàng đợi kiểm duyệt điểm đến, lọc theo trạng thái (`PENDING`, `APPROVED`, `REJECTED`), xem trước thông tin và nút duyệt/từ chối kèm lý do.

### 3.4. Dữ liệu Hạt giống & Thẩm định
- `backend/src/main/resources/db/seed/destinations_seed.csv`: 350 địa danh du lịch Việt Nam đạt chuẩn toàn vẹn dữ liệu.
- `scripts/validate_destinations_csv.ps1`: Script PowerShell kiểm tra tự động 100% tọa độ GPS, phân bổ địa phương, giờ mở cửa và link kiểm chứng.

---

## 4. DANH SÁCH REST API VÀ HỢP ĐỒNG LIÊN-ACTOR

### 4.1. API Dành cho Khách vãng lai & Thành viên (Guest / Member)
- `GET /api/v1/destinations`: Tìm kiếm và lọc điểm đến công khai. Hỗ trợ tham số `keyword` (tiếng Việt có/không dấu), `province`, `category`, `priceMax`, `page`, `size`. Chỉ trả về bản ghi `PUBLISHED`.
- `GET /api/v1/destinations/{id}`: Xem chi tiết điểm đến. Trả về `404 Not Found` nếu điểm đến không tồn tại hoặc chưa `PUBLISHED`.
- `GET /api/v1/destinations/{id}/favorite-status`: Kiểm tra trạng thái yêu thích của người dùng hiện tại đối với điểm đến.
- `POST /api/v1/destinations/{id}/favorite`: Thêm điểm đến vào danh sách yêu thích cá nhân (yêu cầu đăng nhập, bảo đảm tính idempotent).
- `DELETE /api/v1/destinations/{id}/favorite`: Bỏ điểm đến khỏi danh sách yêu thích.
- `GET /api/v1/destinations/favorites`: Lấy danh sách điểm đến yêu thích của người dùng hiện tại (chỉ trả về điểm đến `PUBLISHED`).
- `POST /api/v1/destinations/{id}/history`: Ghi nhận lịch sử xem điểm đến cá nhân (tự động cập nhật thời điểm xem gần nhất).
- `GET /api/v1/destinations/history`: Xem danh sách lịch sử các điểm đến vừa xem (phân trang, sắp xếp theo thời gian mới nhất).

### 4.2. API Dành cho Quản trị viên & Kiểm duyệt (Admin / Moderator)
- `GET /api/v1/admin/destinations`: Hàng đợi kiểm duyệt điểm đến dành cho Admin/Moderator (hỗ trợ lọc `status`: `DRAFT`, `PUBLISHED`, `REJECTED`, `ALL`, cùng `keyword`, `province`, `category` và phân trang).
- `GET /api/v1/admin/destinations/stats`: Thống kê tổng số và phân bổ số lượng điểm đến theo trạng thái (`total`, `draft`, `published`, `rejected`).
- `GET /api/v1/admin/destinations/{id}`: Xem chi tiết điểm đến cho quản trị viên/kiểm duyệt viên ở bất kỳ trạng thái nào để thẩm định.
- `PUT /api/v1/admin/destinations/{id}/approve`: Phê duyệt xuất bản điểm đến chuyển trạng thái sang `PUBLISHED` (ghi nhận `verifiedAt`).
- `PUT /api/v1/admin/destinations/{id}/reject`: Từ chối điểm đến chuyển trạng thái sang `REJECTED` kèm lý do/ghi chú từ chối (`note`).
- `PUT /api/v1/admin/destinations/{id}/status`: Cập nhật hoặc hoàn tác trạng thái kiểm duyệt linh hoạt (`DRAFT`, `PUBLISHED`, `REJECTED`).
- `POST /api/v1/destinations`: Tạo mới điểm đến du lịch (yêu cầu vai trò `ADMIN` hoặc `MODERATOR`).

### 4.3. Hợp đồng Liên-Actor `DestinationQueryService`
- `Optional<DestinationSummary> findPublishedById(UUID id)`: Phục vụ TV3 truy xuất chi tiết điểm dừng lịch trình.
- `List<DestinationSummary> findPublishedByIds(List<UUID> ids)`: Phục vụ nạp hàng loạt điểm đến cho chuyến đi.
- `List<DestinationSummary> searchPublished(String keyword, String province, String category)`: Phục vụ TV4 AI Planner tìm ứng viên điểm đến dựa theo prompt tiếng Việt (hỗ trợ không dấu).
- `boolean isPublished(UUID id)`: Thẩm định điểm đến có đủ điều kiện đưa vào lịch trình hoặc tính toán ngân sách hay không.

---

## 5. KẾT QUẢ KIỂM ĐỊNH THỰC TẾ (TEST EXECUTION EVIDENCE)

### 5.1. Backend JUnit Suites: 86/86 PASS (100%)
```powershell
# Chạy toàn bộ 13 test suites của Destination Module (78 tests)
.\gradlew test --tests "com.vista.destination.*"
BUILD SUCCESSFUL in 24s (78 tests, 0 failures, 0 errors, 0 skipped)

# Chạy kiểm thử phân quyền RBAC Spring Security (8 tests)
.\gradlew test --tests "com.vista.auth.SecurityAuthorizationTest"
BUILD SUCCESSFUL in 24s (8 tests, 0 failures, 0 errors, 0 skipped)
```

**Bảng thống kê 13 Test Suites Backend:**
1. `AdminDestinationController WebMvc Security & REST API Tests`: 13 tests PASS
2. `DestinationControllerTest`: 8 tests PASS
3. `DestinationQueryServiceTest`: 5 tests PASS
4. `OpeningHoursValidationTest`: 3 tests PASS
5. `DestinationIntegrationFlowTest`: 4 tests PASS
6. `TV1 Week 6: Destination Moderation Queue & Approval`: 5 tests PASS
7. `TV1 Week 5: Destination Discovery & Contract Query Service`: 4 tests PASS
8. `DestinationWeek7: Multi-Filter Sensitivity & Edge Case Tests`: 5 tests PASS
9. `DestinationWeek7: Public API Data Isolation & Security Hardening`: 6 tests PASS
10. `DestinationWeek7: Unaccented Vietnamese Search Tests`: 12 tests PASS
11. `Detail & Favorite status integration`: 2 tests PASS
12. `Favorites Management Tests`: 7 tests PASS
13. `Destination History Tests`: 4 tests PASS

### 5.2. Java Code Formatting (Spotless)
```powershell
.\gradlew spotlessCheck
BUILD SUCCESSFUL in 8s (0 formatting violations)
```

### 5.3. Mobile Tests & TypeScript Check
```powershell
cd mobile
npm test -- src/features/discovery/__tests__/DiscoverScreen.test.tsx --runInBand
PASS src/features/discovery/__tests__/DiscoverScreen.test.tsx (11/11 tests PASS, Time: 3.122 s)

npm run typecheck
tsc --noEmit (Exit code 0, 0 errors)
```

### 5.4. Web Typecheck & ESLint
```powershell
cd web
npm run typecheck
tsc --noEmit (Exit code 0, 0 errors)

npx eslint "src/app/(protected)/moderation" "src/app/(protected)/destinations"
Exit code 0 (0 errors, 0 warnings)
```

### 5.5. OpenAPI Contract & Seed Data
```powershell
cd contracts
npm run api:validate
Woohoo! Your API description is valid. 🎉

cd ..
powershell -ExecutionPolicy Bypass -File scripts\validate_destinations_csv.ps1
ALL 350 RECORDS PASSED ALL INTEGRITY & VALIDATION TESTS!
```

---

## 6. DANH MỤC LỖI ĐÃ KHẮC PHỤC VÀ VẤN ĐỀ CÒN TỒN TẠI

### 6.1. Các lỗi đã xử lý dứt điểm trong Tuần 7–8
- **[ĐÃ XỬ LÝ] Tìm kiếm tiếng Việt không dấu bị trượt kết quả:** Người dùng tìm `da nang`, `hoi an`, `chua cau`, `ba na`, `vinh ha long` không ra kết quả. Đã khắc phục bằng cơ chế chuẩn hóa slug-tokens trong `DestinationService` và `StubDestinationQueryService`.
- **[ĐÃ XỬ LÝ] Bộ lọc vé 0đ (miễn phí):** Điểm đến miễn phí như Cầu Rồng Đà Nẵng hiển thị chính xác khi chọn `priceMax = 0`.
- **[ĐÃ XỬ LÝ] An toàn dữ liệu công khai (Data Isolation):** Điểm đến `DRAFT` và `REJECTED` bị chặn hoàn toàn khỏi tìm kiếm công khai và trả về HTTP 404 khi cố truy cập trực tiếp bằng ID.
- **[ĐÃ XỬ LÝ] Cảnh báo thẻ `<img>` trên Next.js:** Bổ sung comment chỉ thị `@next/next/no-img-element` cho các thẻ ảnh preview upload blob và ảnh CDN ngoài kèm error fallback, đưa cảnh báo ESLint về 0.
- **[ĐÃ XỬ LÝ] Rò rỉ mock state trong Mobile Jest:** Reset mock sau mỗi test case, đảm bảo 11/11 test pass ổn định độc lập.

### 6.2. Phân loại các vấn đề còn tồn tại
- **P3 (Thấp / Bên ngoài phạm vi TV1):**
  - Trong `mobile/package-lock.json`, `web/package-lock.json`, `backend/package-lock.json`, `scripts/test_live_backend.js` và `backend/src/test/java/com/vista/PostgresMigrationTest.java` có các thay đổi chưa commit từ các thành viên khác. Các file này được giữ nguyên vẹn trong working tree theo đúng quy tắc an toàn Git.
  - Ba cảnh báo OpenAPI (`no-server-example.com`, thiếu 4xx cho `/health` và `/auth/login`) là cảnh báo hạ tầng dùng chung từ W1, không ảnh hưởng đến chức năng API.

---

## 7. CÁC HẠNG MỤC PHỤ THUỘC LIÊN THÀNH VIÊN (CROSS-ACTOR DEPENDENCIES)

1. **Phụ thuộc vào TV2 (Security & User Identity):**
   - API Favorites và History phụ thuộc vào JWT Token của TV2 (`SecurityContextHolder.getContext().getAuthentication().getName()`). Phân quyền Role `ROLE_ADMIN` và `ROLE_MODERATOR` được bảo đảm qua Spring Security config.
2. **Cung cấp cho TV3 (Itinerary & Collaboration):**
   - TV3 sử dụng `DestinationQueryService.findPublishedById(UUID)` để nạp thông tin điểm đến khi người dùng thêm một điểm dừng vào lịch trình chuyến đi.
   - Khi TV3 viết test unit độc lập không cần database, sử dụng `StubDestinationQueryService`.
3. **Cung cấp cho TV4 (Budget & AI Itinerary Planner):**
   - TV4 sử dụng `DestinationQueryService.searchPublished(keyword, province, category)` để truy xuất danh sách điểm đến ứng viên khi người dùng yêu cầu AI lập lịch trình bằng tiếng Việt (có dấu hoặc không dấu).
   - Giá vé `priceMin`/`priceMax` của TV1 cung cấp số liệu để TV4 dự toán chi phí tham quan trong ngân sách chuyến đi.
4. **Cung cấp cho TV5 (Community & Social Feed):**
   - TV5 có thể liên kết bài viết cộng đồng tới địa danh qua `destinationId`. Web Admin moderation của TV1 được thiết kế sẵn sàng tích hợp mở rộng kiểm duyệt bài viết cộng đồng khi API báo cáo vi phạm của TV5 hoàn thiện.

---

## 8. HƯỚNG DẪN CHẠY VÀ KIỂM THỬ CÁC CHỨC NĂNG CHÍNH

### 8.1. Khởi động Backend
```powershell
cd backend
.\gradlew bootRun
# Backend chạy tại: http://localhost:8080/api/v1
```

### 8.2. Khởi động Web Admin (Next.js)
```powershell
cd web
npm run dev
# Mở trình duyệt tại: http://localhost:3000/destinations hoặc http://localhost:3000/moderation
```

### 8.3. Khởi động Mobile App (Expo)
```powershell
cd mobile
npx expo start
# Quét mã QR bằng Expo Go trên thiết bị thật hoặc bấm 'a' để mở Android Emulator
```

### 8.4. Lệnh kiểm thử nhanh (One-Liner Verification)
```powershell
# 1. Kiểm tra Backend (Tests + Spotless)
cd backend && .\gradlew spotlessCheck test --tests "com.vista.destination.*" --tests "com.vista.auth.SecurityAuthorizationTest"

# 2. Kiểm tra Mobile (Tests + Typecheck)
cd ..\mobile && npm run typecheck && npm test -- src/features/discovery/__tests__/DiscoverScreen.test.tsx --runInBand

# 3. Kiểm tra Web (Typecheck + Lint)
cd ..\web && npm run typecheck && npx eslint "src/app/(protected)/moderation" "src/app/(protected)/destinations"

# 4. Kiểm tra OpenAPI Contract
cd ..\contracts && npm run api:validate
```

---

## 9. KỊCH BẢN DEMO 5 PHÚT (TV1 DEMO WALKTHROUGH)

Kịch bản demo được thiết kế cô đọng, trực quan và chỉ sử dụng các tính năng đã được kiểm chứng hoạt động 100% trong môi trường hiện tại:

### Bước 1: Mở màn hình Khám phá trên Mobile (0:00 – 0:45)
- Mở ứng dụng VISTA trên thiết bị di động / simulator, chuyển sang tab **Khám phá** (`DiscoverScreen`).
- Quan sát giao diện: Header *"Khám phá Việt Nam"*, thanh tìm kiếm, các hàng chip bộ lọc (Tỉnh/Thành, Danh mục, Ngân sách vé tối đa) và danh sách điểm đến du lịch đã nạp sẵn.
- Mỗi thẻ điểm đến hiển thị rõ ràng: Tên, ảnh thumbnail, thẻ danh mục (Văn hóa, Nghỉ dưỡng...), thông tin giá vé (ví dụ: *"Miễn phí vé vào cổng"* hoặc *"900.000 đ – 1.250.000 đ"*).

### Bước 2: Tìm kiếm Tiếng Việt Không Dấu & Có Dấu (0:45 – 1:45)
- Nhập từ khóa không dấu: `da nang` $\rightarrow$ Bấm **Tìm**. Hệ thống hiển thị ngay: *Cầu Rồng Đà Nẵng*, *Bà Nà Hills*.
- Nhập từ khóa không dấu khác: `hoi an` hoặc `chua cau` $\rightarrow$ Hệ thống hiển thị: *Phố cổ Hội An*, *Chùa Cầu*.
- Nhập từ khóa có dấu nguyên bản: `Vịnh Hạ Long` $\rightarrow$ Hệ thống hiển thị chính xác *Vịnh Hạ Long*.
- Thử nghiệm ký tự hoa thường hoặc khoảng trắng thừa (`"   BA NA   "`) $\rightarrow$ Hệ thống tự động cắt tỉa và tìm đúng *Bà Nà Hills*.

### Bước 3: Lọc Đa Tiêu Chí & Vé Miễn Phí (1:45 – 2:30)
- Chọn chip Tỉnh/Thành: `Đà Nẵng`.
- Chọn chip Thể loại: `Văn hóa`.
- Chọn chip Mức giá: `Miễn phí (0đ)`.
- Quan sát thanh trạng thái: *"Đang áp dụng bộ lọc tùy chỉnh"* xuất hiện cùng nút *"✕ Đặt lại tất cả"*.
- Kết quả lọc hiển thị chính xác: *Cầu Rồng Đà Nẵng* (giá 0đ, Đà Nẵng, Văn hóa).
- Bấm **✕ Đặt lại tất cả** $\rightarrow$ Hệ thống reset toàn bộ bộ lọc về trạng thái ban đầu mượt mà.

### Bước 4: Kiểm tra An toàn Dữ liệu Công khai (2:30 – 3:15)
- Thực hiện tìm kiếm điểm đến ở trạng thái `DRAFT` hoặc `REJECTED` (ví dụ: điểm đến thử nghiệm "Khu nghỉ dưỡng thử nghiệm Bãi Cháy" chưa được duyệt).
- Kết quả: Không xuất hiện trong danh sách tìm kiếm công khai.
- Cố tình gọi trực tiếp endpoint `GET /api/v1/destinations/{id-chua-duyet}` $\rightarrow$ Backend trả về mã lỗi **404 Not Found** (`DestinationNotFoundException`), bảo đảm bảo mật dữ liệu tuyệt đối cho khách vãng lai.

### Bước 5: Luồng Kiểm duyệt Điểm đến trên Web Admin (3:15 – 4:15)
- Mở Web Admin tại trình duyệt: `http://localhost:3000/moderation`.
- Đăng nhập với tài khoản có quyền `ADMIN` hoặc `MODERATOR`.
- Mở trang **Hàng đợi kiểm duyệt** (`/moderation`), quan sát danh sách các điểm đến đang chờ duyệt (`PENDING_REVIEW`).
- Bấm vào một địa danh để mở modal chi tiết: Xem ảnh hero, mô tả, khoảng giá, giờ mở cửa.
- Bấm nút **Phê duyệt** $\rightarrow$ Trạng thái lập tức cập nhật sang `PUBLISHED` và xuất hiện công khai trên Mobile.
- Đối với điểm đến không đạt tiêu chuẩn: Bấm **Từ chối**, nhập lý do từ chối (ví dụ: *"Thông tin giá vé chưa chính xác"*), xác nhận trạng thái chuyển sang `REJECTED`.

### Bước 6: Trình bày Bằng chứng Kiểm thử Tự động (4:15 – 5:00)
- Mở terminal và chỉ rõ kết quả:
  - 86 bài kiểm thử Backend đạt 100% PASS (78 destination tests + 8 security authorization tests).
  - 11 bài kiểm thử Mobile Jest đạt 100% PASS.
  - Spotless Java code formatting: 0 vi phạm.
  - TypeScript biên dịch cả Web và Mobile: 0 lỗi (`tsc --noEmit`).
  - ESLint trên các trang TV1: 0 cảnh báo, 0 lỗi.
  - Bộ 350 dữ liệu hạt giống: Đạt 100% kiểm định GPS và cấu trúc giờ mở cửa.

---

## 10. ĐIỀU KIỆN ĐÓNG BĂNG MÃ NGUỒN (CODE FREEZE CRITERIA)

TV1 chính thức xác nhận các điều kiện đóng băng mã nguồn cho Tuần 8 đã được thỏa mãn đầy đủ:
- [x] Toàn bộ 86 kiểm thử Backend (Destination + Security RBAC) chạy thành công.
- [x] Toàn bộ 11 kiểm thử Mobile Discovery chạy thành công.
- [x] Không còn lỗi P0/P1 trong phạm vi TV1.
- [x] Không còn cảnh báo ESLint trên các trang TV1 (`/destinations`, `/moderation`).
- [x] Chuẩn hóa định dạng mã nguồn Java đạt chuẩn Spotless Google Java Format.
- [x] Tìm kiếm tiếng Việt không dấu và lọc đa tiêu chí hoạt động ổn định trên cả Backend và Mobile.
- [x] Cô lập dữ liệu công khai (Data Isolation) bảo đảm an toàn dữ liệu khách vãng lai.
- [x] Nhánh Git được cách ly an toàn trên `feature/son-tv1/tuan7-8-destination`, không làm ảnh hưởng đến nhánh `dev`, `main` hay các thành viên khác.
