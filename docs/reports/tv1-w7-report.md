# BÁO CÁO KẾT QUẢ TRIỂN KHAI VÀ KIỂM THỬ TUẦN 7 (TV1)

**Dự án:** VISTA (Vietnam Smart Travel Assistant)  
**Nhánh Git:** `feature/son-tv1/tuan7-8-destination`  
**Vai trò:** TV1 – Destination Discovery, Destination Moderation & Mobile Lead  
**Thời gian thực hiện:** Tuần 7  
**Commit cơ sở:** `3cd80a7` (nền tảng hoàn tất tuần 1–6)  

---

## 1. TỔNG QUAN MỤC TIÊU TUẦN 7

Tuần 7 tập trung vào kiểm thử hồi quy toàn diện, nâng cấp trải nghiệm tìm kiếm tiếng Việt không dấu, độ nhạy và tính chính xác của bộ lọc đa tiêu chí, bảo đảm tuyệt đối tính cô lập dữ liệu công khai (Public Data Isolation) cho Guest/Visitor và đồng bộ chất lượng mã nguồn trên cả 3 nền tảng: Backend (Spring Boot), Mobile (React Native / Expo), và Web (Next.js 14).

---

## 2. CHI TIẾT CÁC CÔNG VIỆC ĐÃ TRIỂN KHAI

### 2.1. Tìm kiếm tiếng Việt không dấu (Unaccented Vietnamese Search)

- **Bài toán:** Khách du lịch thường gõ bàn phím không dấu hoặc không bật bộ gõ tiếng Việt trên điện thoại di động (ví dụ: `da nang`, `hoi an`, `ba na`, `chua cau`, `vinh ha long`). Hệ thống cần tìm đúng các điểm đến tương ứng mà không làm mất khả năng tìm kiếm có dấu, không yêu cầu thay đổi database schema và không phát sinh dependency cồng kềnh.
- **Giải pháp kỹ thuật:**
  - Bổ sung hàm chuẩn hóa `stripAccents(String input)` tại `DestinationService.java` và `StubDestinationQueryService.java` sử dụng chuẩn `java.text.Normalizer.Form.NFD` kết hợp regex `\p{InCombiningDiacriticalMarks}+`.
  - Nâng cấp `createSearchSpec`:
    - Tìm kiếm chuỗi nguyên bản (case-insensitive) trên trường `name` và `description`.
    - Chuẩn hóa từ khóa tìm kiếm thành chuỗi không dấu, tách thành các token độc lập và đối chiếu theo mẫu `%token1%token2%` trên trường `slug`, `province.slug` và `category.slug`.
    - Mọi điểm đến khi lưu đều đã được sinh slug tự động thông qua `toSlug(name)`. Cơ chế này bảo đảm tốc độ truy vấn tối ưu trên chỉ mục có sẵn mà không cần extension database bên ngoài.
  - Áp dụng tương tự cho hàng đợi duyệt của Moderator trong `searchModerationQueue`.
  - Cập nhật bộ dữ liệu mẫu trong `StubDestinationQueryService` (bổ sung "Chùa Cầu", "Vịnh Hạ Long", "Phố cổ Hội An") hỗ trợ tìm kiếm không dấu chuẩn xác cho TV3 và TV4.

### 2.2. Kiểm tra và hoàn thiện bộ lọc đa tiêu chí

- **Độ nhạy bộ lọc:**
  - Hỗ trợ lọc đồng thời nhiều tiêu chí: Từ khóa + Tỉnh/Thành + Thể loại + Mức giá tối đa (`priceMax`).
  - Hỗ trợ chính xác trường hợp **vé miễn phí (0 đồng)**: Khi `priceMax = 0`, hệ thống tìm chính xác các điểm đến có `priceMin = 0` hoặc vé vào cửa tự do (ví dụ: Cầu Rồng Đà Nẵng).
  - Xử lý chuỗi rỗng, chuỗi chỉ chứa khoảng trắng (`"   "`): Tự động chuẩn hóa và không áp dụng điều kiện lọc thừa.
  - Xử lý ký tự đặc biệt trong từ khóa: Chuẩn hóa an toàn, không gây crash hoặc lỗi cú pháp truy vấn.
  - Kiểm tra trạng thái rỗng (empty state) và nút Reset bộ lọc trên Mobile.

### 2.3. Bảo mật API công khai và an toàn dữ liệu (Public Data Isolation)

- **Nguyên tắc nghiệp vụ:** Khách vãng lai (Guest/Visitor) qua Mobile app hoặc Public API tuyệt đối không được tiếp cận các điểm đến ở trạng thái `DRAFT` (Bản nháp) hoặc `REJECTED` (Bị từ chối).
- **Rà soát và củng cố:**
  - `GET /api/v1/destinations`: Chỉ trả về danh sách có `status = 'PUBLISHED'`.
  - `GET /api/v1/destinations/{id}`: Nếu điểm đến tồn tại nhưng mang trạng thái `DRAFT` hoặc `REJECTED`, hệ thống ném ngoại lệ `DestinationNotFoundException` (HTTP 404 Not Found), che giấu hoàn toàn sự tồn tại của bản ghi chưa duyệt.
  - Hợp đồng liên module `DestinationQueryService` (dành cho TV3 Tour/Booking và TV4 Itinerary/AI): Phương thức `findPublishedById` và `searchPublished` chỉ truy vấn dữ liệu đã phê duyệt (`PUBLISHED`).
  - Luồng Yêu thích (Favorites) và Lịch sử (History): Từ chối lưu hoặc liên kết với các điểm đến chưa được công bố.

---

## 3. BẢNG TRUY XUẤT YÊU CẦU VÀ BỘ TEST TUẦN 7

| Mã yêu cầu | Mô tả kiểm thử | Test Class / Suite | Số lượng | Kết quả |
|:---|:---|:---|:---:|:---:|
| **FR-DEST-01** | Tìm kiếm không dấu: `da nang`, `hoi an`, `chua cau`, `ba na`, `vinh ha long`, viết hoa, khoảng trắng thừa | `DestinationWeek7RegressionTest$UnaccentedSearchTests` | 12 tests | **PASS** |
| **FR-DEST-02** | Bộ lọc nhạy: Kết hợp nhiều tiêu chí, giá vé 0 đồng, ký tự đặc biệt, từ khóa rỗng, không có kết quả | `DestinationWeek7RegressionTest$FilterSensitivityTests` | 5 tests | **PASS** |
| **SEC-DEST-01** | Cô lập dữ liệu: DRAFT & REJECTED không xuất hiện trên Public Search, trả về 404 khi truy cập trực tiếp | `DestinationWeek7RegressionTest$PublicDataIsolationTests` | 6 tests | **PASS** |
| **FR-MOB-01** | Mobile Discovery: Tìm kiếm không dấu, ký tự đặc biệt, lọc vé 0đ, xử lý lỗi API và retry | `DiscoverScreen.test.tsx` (Mobile Jest) | 4 tests mới (11 tổng) | **PASS** |
| **REG-DEST-ALL** | Toàn bộ kiểm thử hồi quy TV1 (Tuần 1–6): Giờ mở cửa, Yêu thích, Lịch sử, Duyệt điểm đến, Phân quyền Admin/Mod | `com.vista.destination.*` | 78 tests | **PASS** |
| **REG-AUTH** | Phân quyền xác thực API (RBAC Guest/User/Admin/Moderator) | `SecurityAuthorizationTest` | 8 tests | **PASS** |

---

## 4. KẾT QUẢ THỰC THI KIỂM THỬ THỰC TẾ

### 4.1. Backend JUnit Tests

```
.\gradlew test --tests "com.vista.destination.*"
BUILD SUCCESSFUL in 20s
Tests run: 78, Failures: 0, Errors: 0, Skipped: 0
```

**Chi tiết 13 Test Suites:**
1. `AdminDestinationController WebMvc Security & REST API Tests`: 13 tests PASS
2. `com.vista.destination.api.DestinationControllerTest`: 8 tests PASS
3. `com.vista.destination.application.DestinationQueryServiceTest`: 5 tests PASS
4. `com.vista.destination.domain.OpeningHoursValidationTest`: 3 tests PASS
5. `com.vista.destination.integration.DestinationIntegrationFlowTest`: 4 tests PASS
6. `TV1 Week 6: Destination Moderation Queue & Approval`: 5 tests PASS
7. `TV1 Week 5: Destination Discovery & Contract Query Service`: 4 tests PASS
8. `DestinationWeek7: Multi-Filter Sensitivity & Edge Case Tests`: 5 tests PASS
9. `DestinationWeek7: Public API Data Isolation & Security Hardening`: 6 tests PASS
10. `DestinationWeek7: Unaccented Vietnamese Search Tests`: 12 tests PASS
11. `Detail & Favorite status integration`: 2 tests PASS
12. `Favorites Management Tests`: 7 tests PASS
13. `Destination History Tests`: 4 tests PASS

```
.\gradlew test --tests "com.vista.auth.SecurityAuthorizationTest"
BUILD SUCCESSFUL in 16s
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
```

### 4.2. Java Code Formatting (Spotless)

```
.\gradlew spotlessCheck
BUILD SUCCESSFUL in 8s
2 actionable tasks: 2 up-to-date (0 formatting violations)
```

### 4.3. Mobile Jest & TypeScript Check

```
npm test -- src/features/discovery/__tests__/DiscoverScreen.test.tsx --runInBand
PASS src/features/discovery/__tests__/DiscoverScreen.test.tsx
Tests: 11 passed, 11 total
Time: 2.491 s

npm run typecheck (mobile)
tsc --noEmit -> Exit code 0 (0 errors)
```

### 4.4. Web Typecheck & ESLint

```
npm run typecheck (web)
tsc --noEmit -> Exit code 0 (0 errors)

npx eslint "src/app/(protected)/moderation" "src/app/(protected)/destinations"
0 problems (0 errors, 0 warnings)
```

---

## 5. RÀ SOÁT CẢNH BÁO ESLINT THẺ `<img>` (WEB)

- **Hiện trạng ban đầu:** Next.js ESLint đưa ra 4 cảnh báo `@next/next/no-img-element` tại trang Destinations và Moderation.
- **Đánh giá an toàn:** Các thẻ `<img>` tại đây hiển thị ảnh động tải lên từ máy tính cục bộ (dạng `blob:http...`), ảnh từ CDN bên ngoài và có fallback tự động khi ảnh lỗi (`onError`). Việc thay thế bằng `<Image />` của Next.js tiềm ẩn rủi ro chặn tên miền chưa khai báo trong `next.config.js` hoặc không hỗ trợ đường dẫn preview blob tạm thời.
- **Xử lý:** Bổ sung chú thích `/* eslint-disable-next-line @next/next/no-img-element */` một cách tường minh, duy trì 100% tính ổn định của giao diện và đưa cảnh báo ESLint về **0 warning**.

---

## 6. DANH SÁCH FILE THAY ĐỔI THUỘC PHẠM VI TUẦN 7

1. `backend/src/main/java/com/vista/destination/service/DestinationService.java`
2. `backend/src/main/java/com/vista/destination/application/StubDestinationQueryService.java`
3. `backend/src/test/java/com/vista/destination/integration/DestinationWeek7RegressionTest.java` (File mới)
4. `mobile/src/features/discovery/__tests__/DiscoverScreen.test.tsx`
5. `web/src/app/(protected)/destinations/page.tsx`
6. `web/src/app/(protected)/moderation/page.tsx`
7. `docs/reports/tv1-w7-report.md` (File mới)

---

## 7. BẢO TOÀN TRẠNG THÁI HỆ THỐNG VÀ GIT

- **Nhánh hiện tại:** `feature/son-tv1/tuan7-8-destination`
- **Các file ngoài phạm vi được bảo toàn nguyên vẹn trong working tree:**
  - `backend/src/test/java/com/vista/PostgresMigrationTest.java`
  - `mobile/package-lock.json`
  - `web/package-lock.json`
  - `web/src/app/layout.tsx`
  - `admin/tsconfig.tsbuildinfo`
  - `backend/package-lock.json`
  - `scripts/test_live_backend.js`
- **Tuyệt đối tuân thủ:** Không push/merge vào `dev` hoặc `main`, không đè nhánh `w5-w6`, chỉ push lên `origin/feature/son-tv1/tuan7-8-destination`.
