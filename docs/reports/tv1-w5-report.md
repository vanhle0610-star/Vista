# BÁO CÁO TRIỂN KHAI TUẦN 5 — THÀNH VIÊN 1 (TV1)
**Vai trò:** TV1 — Guest / Visitor, Destination Discovery & Mobile Lead  
**Dự án:** VISTA — Nền tảng Hỗ trợ Du lịch Thông minh  
**Branch làm việc:** `feature/son-tv1/tuan3-4-destination-discovery`  
**Trạng thái Git:** Chỉ lưu trên local working tree (KHÔNG COMMIT, KHÔNG PUSH theo đúng yêu cầu)  

---

## 1. Mục tiêu và Phạm vi Tuần 5 của TV1

Căn cứ theo SRS (FR-DEST-01 đến FR-DEST-04), kiến trúc module `DestinationQueryService` và phân công liên thành viên (Cross-Actor Integration):
- **Phục vụ TV4 (AI Planner):** Cung cấp API truy vấn điểm đến có ràng buộc ngân sách vé (`priceMax`) và đảm bảo trường giờ mở cửa (`openingHours`) chuẩn hóa cấu trúc JSON 7 ngày (`mon` đến `sun`) để AI Planner kiểm tra tính khả thi của lộ trình theo ngày trong tuần.
- **Phục vụ TV3 (Itinerary Stop Proposals):** Cung cấp thông tin giá vé tham khảo (`priceMin`, `priceMax`) chính xác để tính toán chi phí dự kiến cho lịch trình du lịch.
- **Nâng cấp Mobile Discovery (FR-DEST-03):** Bổ sung bộ lọc đa tiêu chí trên ứng dụng Mobile (Tỉnh/Thành phố, Chủ đề/Thể loại, Mức giá trần tối đa, Từ khóa tìm kiếm) và nút đặt lại (reset) bộ lọc tức thì.
- **Kiểm thử tích hợp (Week 5 Integration Test):** Viết bộ kiểm thử tự động xác minh contract, mapping và stub service.

---

## 2. Kết quả triển khai kỹ thuật

### A. Backend: Nâng cấp Contract `DestinationQueryService` & `DestinationService`
1. **Mở rộng Contract `DestinationQueryService`:**
   - Bổ sung phương thức nạp chồng (overload) có tham số ngân sách:
     ```java
     List<DestinationSummary> searchPublished(
         String keyword, String province, String category, BigDecimal priceMax, int limit);
     ```
   - Cung cấp `default` fallback giữ tương thích ngược 100% với các module của TV3/TV4 đang gọi phương thức 4 tham số cũ.
2. **Triển khai tại `DestinationService`:**
   - Tái cấu trúc hàm sinh Specification `createSearchSpec(...)` hỗ trợ đồng thời tìm kiếm từ khóa không phân biệt hoa thường, tỉnh thành, thể loại và mức giá vé trần `priceMax` (`price_min <= priceMax OR price_min IS NULL`).
   - Cung cấp đầy đủ các phương thức nạp chồng (overload) `searchPublished`:
     - 6 tham số: `searchPublished(keyword, province, category, priceMax, page, size)` cho REST API `/destinations`.
     - 5 tham số: `searchPublished(keyword, province, category, page, size)` tự động gọi với `priceMax = null` đảm bảo 100% tương thích ngược với code cũ.
     - Contract `DestinationQueryService`: `searchPublished(keyword, province, category, priceMax, limit)` và overload 4 tham số.
   - Sửa lỗi mapping: Phương thức `searchPublished` nay trả về đầy đủ `openingHours` (trước đó bị gán `null`), bảo toàn chuỗi JSON 7 ngày phục vụ AI Planner.
3. **Cập nhật `StubDestinationQueryService`:**
   - Bổ sung dữ liệu mẫu có cấu trúc 7 ngày (`mon` đến `sun`) và logic lọc theo `priceMax` giúp test môi trường không cần database vẫn hoạt động chính xác.

### B. Mobile: Nâng cấp Giao diện Khám phá Đa Tiêu Chí (`DiscoverScreen.tsx`)
1. **Bộ lọc Thể loại (Category Chips):**
   - Hỗ trợ chọn nhanh các thể loại trọng điểm: `Tất cả`, `Văn hóa`, `Lịch sử`, `Thiên nhiên`, `Biển`, `Tâm linh`, `Nghỉ dưỡng`, `Ẩm thực`, `Sinh thái`.
2. **Bộ lọc Mức giá vé tối đa (Price Filter Chips):**
   - Hỗ trợ các phân khúc giá: `Tất cả giá`, `Miễn phí (0đ)`, `≤ 100k`, `≤ 300k`, `≤ 500k`, `≤ 1 triệu`.
3. **Thanh trạng thái bộ lọc & Đặt lại (Active Filter Bar & Reset Action):**
   - Hiển thị badge báo hiệu khi có bất kỳ bộ lọc nào đang được kích hoạt.
   - Nút "✕ Đặt lại tất cả" đưa toàn bộ tìm kiếm, tỉnh thành, thể loại và mức giá về mặc định chỉ với 1 chạm.
4. **Hiển thị thẻ điểm đến:**
   - Hiển thị rõ thể loại (`categoryBadge`), tỉnh thành (`provinceTag`), mức giá vé định dạng chuẩn tiền tệ Việt Nam (`formatPrice`), nút yêu thích (`cardFavBtn`).

---

## 3. Danh sách kiểm thử & Kết quả xác minh

| STT | Bài kiểm thử / Công cụ | Đối tượng kiểm tra | Kết quả thực tế |
|---|---|---|---|
| 1 | `DestinationWeek5IntegrationTest` | Ràng buộc giá vé, bảo toàn `openingHours`, Stub service, xử lý điểm đến miễn phí (0 VND) | **PASS** (BUILD SUCCESSFUL) |
| 2 | `DestinationServiceTest` | Logic nghiệp vụ service destination | **PASS** (BUILD SUCCESSFUL) |
| 3 | `DestinationQueryServiceTest` | Contract tìm kiếm điểm đến đã xuất bản | **PASS** (BUILD SUCCESSFUL) |
| 4 | `DestinationIntegrationFlowTest` | Luồng nghiệp vụ Visitor (Search -> Detail -> Favorite -> History) | **PASS** (BUILD SUCCESSFUL) |
| 5 | Mobile TypeScript (`tsc --noEmit`) | Kiểm tra kiểu dữ liệu toàn bộ ứng dụng Mobile | **PASS** (0 lỗi) |
| 6 | Web TypeScript (`tsc --noEmit`) | Kiểm tra kiểu dữ liệu toàn bộ ứng dụng Web | **PASS** (0 lỗi) |
| 7 | Mobile Jest (`jest --runInBand`) | Kiểm tra các test suites của Mobile | **14 PASSED, 49 tests passed** (2 test suites của TV3/TV4 thiếu mock `expo-linking`, 100% test của TV1 pass) |

---

## 4. Bàn giao liên thành viên (Cross-Actor Handover)

- **Gửi TV4 (AI Planner):**
  - Contract `DestinationQueryService.searchPublished` đã sẵn sàng nhận `BigDecimal priceMax` để lọc ứng viên điểm đến nằm trong trần ngân sách người dùng cài đặt.
  - Trường `openingHours` trong `DestinationSummary` được bảo toàn nguyên bản dạng chuỗi JSON 7 ngày, cho phép TV4 parse và validate lịch trình theo `tripDate.getDayOfWeek()`.
- **Gửi TV3 (Itinerary & Stop Proposals):**
  - Giá vé `priceMin` và `priceMax` trả về đúng giá trị số (VND) hoặc `0` nếu miễn phí, không bị lỗi null khi tính tổng chi phí dự kiến cho ngày đi.

---

## 5. Xác nhận trạng thái Git & Working Tree
- **Branch hiện tại:** `feature/son-tv1/tuan3-4-destination-discovery`
- **Trạng thái Working Tree:** **Chưa commit (Uncommitted / Dirty)**. Toàn bộ thay đổi của Tuần 5 và các thay đổi có từ trước đều đang được lưu giữ trực tiếp trên local working tree (không staged, không commit).
- **Phân loại file thực tế:**
  - *Thay đổi thuộc Tuần 5:* `DestinationQueryService.java`, `DestinationService.java`, `StubDestinationQueryService.java`, `DiscoverScreen.tsx`, `DestinationWeek5IntegrationTest.java` (untracked), `tv1-w5-report.md` (untracked).
  - *Thay đổi có từ trước Tuần 5:* `PostgresMigrationTest.java` (bật Flyway cho test), `web/src/app/layout.tsx` (bảo toàn hydration warning và ReactNode children).
  - *File cập nhật sau npm install:* `mobile/package-lock.json`, `web/package-lock.json`.
  - *File tạm / Sinh tự động:* `admin/tsconfig.tsbuildinfo`, `backend/package-lock.json`, `scripts/test_live_backend.js`.
- **Xác nhận tuyệt đối:**
  - Không thực hiện bất kỳ lệnh `git commit` nào.
  - Không thực hiện bất kỳ lệnh `git push` nào.
  - Không merge, rebase hoặc đổi branch.
  - Toàn bộ thay đổi local được bảo toàn để tiếp tục Tuần 6.
