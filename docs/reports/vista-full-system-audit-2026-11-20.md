# BÁO CÁO RÀ SOÁT TOÀN DIỆN HỆ THỐNG VISTA (FULL SYSTEM AUDIT)
**Ngày thực hiện:** 2026-11-20  
**Phiên bản hệ thống:** VISTA 2.1 (Sprint 7 / Code Freeze Preparation)  
**Tác giả:** Đội ngũ Kỹ sư Kiểm định Chất lượng & Bảo mật Antigravity  

---

## 1. Tóm Tắt Điều Hành (Executive Summary)

Đợt rà soát toàn diện hệ thống VISTA đã được thực hiện nghiêm ngặt trên toàn bộ 5 thành phần chính: **Web (Next.js 15)**, **Mobile (React Native Expo)**, **Backend (Spring Boot 3 + PostgreSQL)**, **AI Service (FastAPI / MasterPlanner)** và **Hợp đồng giao tiếp (OpenAPI Contracts)**.

Quá trình kiểm tra đã lần theo toàn bộ chuỗi mắt xích nghiệp vụ:
$$\text{UI} \longrightarrow \text{Validation} \longrightarrow \text{API Request} \longrightarrow \text{AuthN/AuthZ} \longrightarrow \text{Service} \longrightarrow \text{Transaction} \longrightarrow \text{Database} \longrightarrow \text{Notification} \longrightarrow \text{Response} \longrightarrow \text{UI State}$$

### Bảng Thống Kê Phân Loại Mức Độ Vấn Đề

| Mức độ | Số lượng | Mô tả trọng tâm |
|---|---:|---|
| **P0 — Critical** | **1** | Lỗ hổng bỏ qua xác thực (Authentication Bypass) tại Next.js Route Guard (`web/src/middleware.ts`) cho phép truy cập trái phép bảng điều khiển quản trị Admin. |
| **P1 — High** | **4** | Dữ liệu giờ mở cửa seed sai JSON làm crash test; Tab Biểu quyết trên Web vẫn là state giả lập; Định tuyến trả đường cong giả lập vi phạm contract; Mobile Typecheck lỗi biên dịch TS. |
| **P2 — Medium** | **6** | Lỗi N+1 query tại Backend Trip API; Secret JWT hardcoded và Access Token 7 ngày; Cho phép tự report bài viết của mình; Bundle tĩnh Web phình to (2.7 vạn dòng code); Xóa chuyến đi cascade; Test tích hợp thông báo chưa cập nhật mock email. |
| **P3 — Low** | **4** | Web chưa có giao diện VietQR động đồng bộ với Mobile; Polling thông báo 5s cố định tại Navbar; Push notification chưa tích hợp gateway FCM thực tế; Linter quét nhầm vendor maplibre worker. |
| **Tổng cộng** | **15** | **1 P0, 4 P1, 6 P2, 4 P3** |

---

## 2. Kết Luận Về Việc Sẵn Sàng Merge (Merge Readiness)

> [!CAUTION]
> **KẾT LUẬN: CHƯA SẴN SÀNG MERGE (BLOCKED)**
> 
> Nhánh hiện tại chưa thể merge vào nhánh chính (`main` / `develop`) do đang vi phạm nghiêm trọng 3 Quality Gate cốt lõi:
> 1. **Lỗi Typecheck tại Mobile:** 2 lỗi TypeScript ngăn cản biên dịch sạch (`npm run typecheck --prefix mobile` báo mã lỗi 1).
> 2. **Lỗi Unit/Integration Tests tại Web và Backend:** 
>    - Web: `scripts/test-route-planner.mjs` thất bại (Missing expected rejection).
>    - Backend: `OpeningHoursValidationTest` và `NotificationRealIntegrationTest` thất bại.
> 3. **Lỗ hổng bảo mật P0:** `web/src/middleware.ts` mở toang toàn bộ các route admin `/dashboard`, `/users`, `/moderation` cho bất kỳ người dùng chưa đăng nhập nào.

---

## 3. Kết Luận Về Việc Sẵn Sàng Release (Release Readiness)

> [!WARNING]
> **KẾT LUẬN: CHƯA SẴN SÀNG PHÁT HÀNH (NOT RELEASE-READY)**
> 
> Hệ thống tuyệt đối chưa được phát hành production/staging vì các lý do sau:
> - **Nguy cơ an ninh:** Token JWT bí mật mặc định nằm lộ trong file cấu hình `application.yml`; Thời hạn sống Access Token kéo dài 7 ngày gây nguy cơ chiếm đoạt phiên nếu rò rỉ.
> - **Chức năng chưa hoàn thiện:** Tab Biểu quyết (Proposals & Voting) trên Web chưa được đấu nối với API Database thật; Người dùng tạo đề xuất trên Web sẽ mất khi F5 hoặc đổi trình duyệt.
> - **Dữ liệu chưa đồng nhất:** 1,594 / 2,294 địa điểm trong cơ sở dữ liệu có thông tin giờ mở cửa bị thiếu hoặc sai chuẩn JSON 7 ngày của Backend.

---

## 4. Phạm Vi Đã Kiểm Tra (Scope Audited)

1. **Web Client (`web/`):**
   - TypeScript compilation (`tsc --noEmit`), ESLint linting, test runner (`scripts/test-*.mjs`), production build (`next build`).
   - Luồng Auth (`lib/api.ts`, cookie/localStorage, token refresh, auto logout).
   - Trang Lập kế hoạch AI (`/planner`), Chi tiết chuyến đi (`/trips/[tripId]`), Thủ quỹ ngân sách (`/trips/[tripId]/treasury`), Nhận lời mời (`/invitations/[token]`).
2. **Mobile App (`mobile/`):**
   - TypeScript compilation (`tsc --noEmit`), Jest Test Suite (`jest --runInBand`), định tuyến GPS Foreground (`useForegroundLocation.ts`), thanh toán VietQR Modal.
3. **Backend Service (`backend/`):**
   - Bộ kiểm thử Gradle (537 tests trên các module Auth, Trip, Collaboration, Budget, Notification, Destination, Admin).
   - Cấu hình Spring Security (`SecurityConfiguration.java`), JPA entity mappings, Cascade deletes, Transaction boundary.
4. **AI Engine Service (`ai-service/`):**
   - Kiến trúc MasterPlanner, Replanner Engine (xử lý lock điểm, hard conflict), loader CSV, cơ sở dữ liệu SQLite `vista_destinations.db`.
5. **OpenAPI Contracts (`contracts/`):**
   - Redocly lint `openapi/openapi.yaml`, đồng bộ kiểu dữ liệu sinh tự động (`api.generated.ts`) giữa Web và Mobile.

---

## 5. Phạm Vi Chưa Kiểm Tra Được & Lý Do (Limitations)

| Thành phần / Kịch bản | Lý do chưa kiểm tra được đầy đủ |
|---|---|
| **E2E Automation (Playwright / Cypress)** | Dự án chưa cấu hình framework E2E tập trung; hiện tại dựa trên các script Node test runner và manual browser testing. |
| **Thanh toán VietQR thực tế với Ngân hàng (NAPAS/Banking App)** | Cần tài khoản ngân hàng và sandbox webhook thực tế từ cổng thanh toán để xác nhận luồng ghi có tự động (hiện tại dựa trên kiểm tra mã QR trực quan và đối soát thủ công). |
| **Gửi Push Notification thực tế ra thiết bị ngoại vi** | Backend mới cấu hình log `[PUSH-DISPATCH]`, chưa đấu nối khóa Firebase Cloud Messaging (FCM) service account JSON thực tế. |
| **Chạy toàn bộ pytest cho AI Service** | Máy kiểm thử hiện tại chưa cài đặt sẵn gói CLI `pytest` toàn cục trong môi trường shell Windows; kiểm tra dựa trên việc đọc mã, phân tích AST và test suite độc lập. |

---

## 6. Bảng Kết Quả Các Quality Gate

| Thành phần | Typecheck | Lint | Test | Build | Kết luận |
|---|:---:|:---:|:---:|:---:|:---:|
| **Web** | ✅ PASS (0 errors) | ❌ FAIL (5875 problems) | ❌ FAIL (1 test failed) | ⚠️ WARN (Worker EPERM lock) | ❌ **FAILED** |
| **Mobile** | ❌ FAIL (2 errors) | ⚠️ WARN (rules) | ⚠️ PASS (với `--forceExit`) | N/A (Expo run) | ❌ **FAILED** |
| **Backend** | N/A (Java) | ✅ PASS (Checkstyle) | ❌ FAIL (2/537 failed) | ✅ PASS (compileJava) | ❌ **FAILED** |
| **AI Service** | ✅ PASS (AST/Syntax) | ✅ PASS | ⚠️ Manual Suite | ✅ PASS (standalone) | ⚠️ **PARTIAL** |
| **OpenAPI** | ✅ PASS (valid) | ✅ PASS (3 warnings) | ✅ PASS (in-sync) | ✅ PASS (generated) | ✅ **PASSED** |

---

## 7. Danh Sách Vấn Đề Chi Tiết (Theo Mức Độ P0 $\longrightarrow$ P3)

### VẤN ĐỀ P0 — CRITICAL

#### [VISTA-SEC-001] Authentication Bypass tại Next.js Route Guard
- **Mức độ:** P0 — Critical
- **Thành phần:** Web Frontend
- **Luồng bị ảnh hưởng:** Luồng 1 (Đăng ký/Đăng nhập) & Luồng 10 (Admin)
- **Mô tả:** Middleware của Next.js định nghĩa danh sách các route bảo vệ (`/dashboard`, `/destinations`, `/users`, `/moderation`) nhưng lại cho phép toàn bộ truy cập đi qua mà không kiểm tra token hay quyền hạn.
- **Bằng chứng cụ thể:**
  - File: [web/src/middleware.ts:20-21](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/middleware.ts#L20-L21)
  ```typescript
  // In local/dev environment, allow all navigation to protected routes
  return NextResponse.next();
  ```
- **Cách tái hiện:**
  1. Mở trình duyệt ẩn danh (chưa đăng nhập bất kỳ tài khoản nào).
  2. Gõ thẳng URL: `http://localhost:3000/dashboard` hoặc `http://localhost:3000/users`.
- **Kết quả mong đợi:** Người dùng bị chặn lại và chuyển hướng về trang `/login?redirect=/dashboard`.
- **Kết quả thực tế:** Giao diện trang Admin được tải và hiển thị bình thường.
- **Nguyên nhân gốc:** Mã debug môi trường dev bị bỏ quên không kèm điều kiện kiểm tra cookie/token phiên làm việc.
- **Tác động:** Bất kỳ ai biết URL đều có thể truy cập vào giao diện quản trị người dùng và điều phối nội dung.
- **Đề xuất sửa:** Đọc cookie `vista_token` từ request. Nếu thiếu hoặc không có role `ADMIN`/`MODERATOR`, redirect về `/login`.
- **Mức độ chắc chắn:** Cao (100%).

---

### VẤN ĐỀ P1 — HIGH

#### [VISTA-DATA-001] Giờ Mở Cửa Seed Sai Chuẩn JSON Gây Crash Test Backend
- **Mức độ:** P1 — High
- **Thành phần:** Backend Seed Data & SQLite
- **Luồng bị ảnh hưởng:** Luồng 4 (AI Planner) & Giai đoạn 5 (Dữ liệu)
- **Mô tả:** Tập dữ liệu địa điểm chứa giờ mở cửa sai schema. Địa điểm `châu battery power` trong file seed có giá trị `{"open": "...", "close": "..."}` thay vì cấu trúc đủ 7 ngày trong tuần (`mon` -> `sun`).
- **Bằng chứng cụ thể:**
  - File: [OpeningHoursValidationTest.java:72](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/test/java/com/vista/destination/domain/OpeningHoursValidationTest.java#L72)
  - Log lỗi: `java.lang.AssertionError: [Must specify all 7 days for destination châu battery power] Expecting actual: ["open", "close"] to contain exactly in any order: ["sat", "sun", "tue", "mon", "fri", "wed", "thu"]`
- **Cách tái hiện:** Chạy lệnh `.\gradlew.bat test --tests com.vista.destination.domain.OpeningHoursValidationTest`.
- **Nguyên nhân gốc:** Quá trình chuẩn hóa dữ liệu từ nguồn OpenStreetMap/Web chưa lọc triệt để các cấu trúc JSON mở cửa dị biệt.
- **Tác động:** Khi AI Engine hoặc Backend tính toán thời gian ghé thăm sẽ gặp lỗi ParseException, dẫn đến việc xếp lịch sai khung giờ.
- **Đề xuất sửa:** Chuẩn hóa toàn bộ các bản ghi sang format chuẩn `{"mon":"08:00-18:00",...,"sun":"08:00-18:00"}` hoặc `"closed"`.
- **Mức độ chắc chắn:** Cao (100%).

#### [VISTA-FE-001] Tab Biểu Quyết Trên Web Vẫn Dùng Dữ Liệu Giả Lập In-Memory
- **Mức độ:** P1 — High
- **Thành phần:** Web Frontend
- **Luồng bị ảnh hưởng:** Luồng 7 (Bình chọn) & SSOT
- **Mô tả:** Màn hình chi tiết chuyến đi [web/src/app/trips/[tripId]/page.tsx](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/app/trips/[tripId]/page.tsx) tab "Biểu quyết địa điểm" hoàn toàn sử dụng hàm mẫu `getSampleProposals` và thao tác trên mảng `useState`. Không có bất kỳ kết nối nào tới API `/api/v1/trips/{tripId}/proposals` hay `/api/v1/proposals/{id}/votes`.
- **Bằng chứng cụ thể:**
  - File: [page.tsx:714, 1121, 1155](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/app/trips/[tripId]/page.tsx#L714)
  ```typescript
  const [proposals, setProposals] = useState(() => getSampleProposals(''));
  ```
- **Tác động:** Người dùng A tạo đề xuất hoặc bỏ phiếu, người dùng B cùng trong chuyến đi không hề thấy; F5 lại trang dữ liệu biến mất.
- **Đề xuất sửa:** Đấu nối `apiRequest<ProposalResponse[]>(/trips/${tripId}/proposals)` và gọi `POST /proposals/{id}/votes`.
- **Mức độ chắc chắn:** Cao (100%).

#### [VISTA-TEST-001] Routing Tự Động Tạo Tuyến Giả Khi Backend Bị Lỗi
- **Mức độ:** P1 — High
- **Thành phần:** Web Map Routing
- **Luồng bị ảnh hưởng:** Luồng 5 (Bản đồ & Định tuyến)
- **Mô tả:** Khi endpoint backend `/api/v1/map/routes` trả mã lỗi 503 ("Chưa cấu hình chỉ đường"), hàm `computeVistaRoute` không trả lỗi mà âm thầm chuyển sang `geodesic-fallback` tự vẽ đường cong giả (`generateCurvedPath`), khiến test hồi quy `test-route-planner.mjs` bị fail vì không bắt được ngoại lệ mong đợi.
- **Bằng chứng cụ thể:**
  - File: [routes.ts:173-210](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/features/map-location/routing/routes.ts#L173-L210)
  - File test: [test-route-planner.mjs:49](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/scripts/test-route-planner.mjs#L49)
  - Log lỗi: `AssertionError [ERR_ASSERTION]: Missing expected rejection. expected: /Chưa cấu hình/, actual: undefined`
- **Đề xuất sửa:** Phân biệt rõ môi trường: nếu Backend trả lỗi có chủ đích (như chưa cấu hình API key), phải ném lỗi rõ ràng lên UI thay vì tự ý vẽ đường nối chim bay.
- **Mức độ chắc chắn:** Cao (100%).

#### [VISTA-MOB-001] Mobile Không Thể Biên Dịch TypeScript & Test Dùng Cờ Che Lỗi
- **Mức độ:** P1 — High
- **Thành phần:** Mobile App (React Native)
- **Luồng bị ảnh hưởng:** Toàn bộ Mobile App & Giai đoạn 7 (Kiểm thử)
- **Mô tả:** Lệnh `npm run typecheck --prefix mobile` gặp 2 lỗi TypeScript ngăn cản build:
  1. `CommunityTools.tsx:284`: `Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?`
  2. `CommunityTools.test.tsx:37`: `Type '"denied"' is not assignable to type 'PermissionStatus'.`
  Đồng thời trong `mobile/package.json` line 14: script `"test": "jest --runInBand --forceExit"` đang dùng cờ `--forceExit` để ép tắt Jest, che giấu các tác vụ bất đồng bộ chưa được giải phóng.
- **Đề xuất sửa:** Sửa đúng cú pháp `StyleSheet.absoluteFill`, sửa kiểu enum `PermissionStatus`, và gỡ bỏ cờ `--forceExit`.
- **Mức độ chắc chắn:** Cao (100%).

---

### VẤN ĐỀ P2 — MEDIUM

#### [VISTA-PERF-001] Lỗi N+1 Query Tại Endpoint Lấy Danh Sách Chuyến Đi
- **Mức độ:** P2 — Medium
- **Thành phần:** Backend Database / JPA
- **Luồng bị ảnh hưởng:** Luồng 2 (Tạo & Quản lý chuyến đi)
- **Bằng chứng:** Trong [TripRepository.java:34](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/main/java/com/vista/trip/domain/TripRepository.java#L34), truy vấn `findAllAccessibleByUser` chỉ `LEFT JOIN t.members` mà không có từ khóa `FETCH`. Khi `TripResponse.from(t)` duyệt qua `t.getMembers()`, Hibernate sẽ kích hoạt N truy vấn `SELECT` riêng lẻ cho từng chuyến đi.
- **Đề xuất sửa:** Đổi câu lệnh JPQL thành `LEFT JOIN FETCH t.members`.

#### [VISTA-SEC-002] JWT Secret Mặc Định Hard-coded & Access Token 7 Ngày
- **Mức độ:** P2 — Medium
- **Thành phần:** Backend Configuration
- **Luồng bị ảnh hưởng:** Luồng 1 (Auth) & Giai đoạn 4 (Bảo mật)
- **Bằng chứng:** Trong [application.yml:76-78](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/main/resources/application.yml#L76-L78), secret key có giá trị fallback `vista-local-dev-super-secure-key-2026-minimum-256-bits-random!` và thời hạn access token là `604800000` ms (7 ngày).
- **Đề xuất sửa:** Buộc `JWT_SECRET` phải nạp từ biến môi trường trên production; hạ thời gian sống của Access Token xuống 15-30 phút, để Refresh Token đảm nhận việc duy trì phiên 7 ngày.

#### [VISTA-SEC-003] Cho Phép Người Dùng Tự Gửi Báo Cáo Vi Phạm Bài Viết Của Chính Mình
- **Mức độ:** P2 — Medium
- **Thành phần:** Backend Moderation
- **Luồng bị ảnh hưởng:** Luồng 8 (Cộng đồng và kiểm duyệt)
- **Bằng chứng:** Trong [ReportService.java:59-64](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/main/java/com/vista/community/application/ReportService.java#L59-L64), phương thức `createReport` chỉ kiểm tra bài viết có tồn tại hay không, không kiểm tra `post.author_id != reporterId`.
- **Đề xuất sửa:** Bổ sung điều kiện chặn `if (post.getAuthorId().equals(reporterId)) throw new BadRequestException("Không thể tự báo cáo nội dung của chính mình");`.

#### [VISTA-FE-002] ESLint Quét File Thư Viện Biên Dịch Sinh Ra 5,875 Lỗi Giả
- **Mức độ:** P2 — Medium
- **Thành phần:** Web Tooling
- **Luồng bị ảnh hưởng:** Quality Gate Lint
- **Bằng chứng:** File [web/public/map-assets/maplibre-gl-worker.mjs](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/public/map-assets/maplibre-gl-worker.mjs) là file vendor worker đã được minify nhưng không được đưa vào danh sách ignore của ESLint, làm tràn màn hình log với 5,875 lỗi cú pháp JavaScript cổ điển.
- **Đề xuất sửa:** Bổ sung `public/map-assets/**` vào `ignorePatterns` trong `eslint.config.mjs`.

#### [VISTA-FE-003] File Dữ Liệu Tĩnh 27,500 Dòng Gây Phình Bundle Frontend
- **Mức độ:** P2 — Medium
- **Thành phần:** Web Performance
- **Luồng bị ảnh hưởng:** Giai đoạn 6 (Hiệu năng)
- **Bằng chứng:** File [web/src/data/realDestinationsData.ts](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/data/realDestinationsData.ts) chứa toàn bộ 2,294 địa điểm được đóng gói cứng trực tiếp vào mã nguồn client JS bundle, làm tăng đáng kể First Load JS của ứng dụng.
- **Đề xuất sửa:** Tách dữ liệu này thành API backend `GET /api/v1/destinations?province=...` có phân trang và cache phía server.

#### [VISTA-BE-001] Xóa Chuyến Đi Cascade Quá Dễ Dàng Mà Không Kiểm Tra Công Nợ
- **Mức độ:** P2 — Medium
- **Thành phần:** Backend Business Rules
- **Luồng bị ảnh hưởng:** Luồng 2 & Luồng 6 (Ngân sách)
- **Bằng chứng:** Trong [TripService.java:111-114](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/main/java/com/vista/trip/application/TripService.java#L111-L114), khi Owner gọi xóa chuyến đi, hệ thống gọi thẳng `tripRepository.delete(trip)` kích hoạt `ON DELETE CASCADE` xóa toàn bộ chi phí và khoản nợ mà không kiểm tra xem trong đoàn có khoản chi tiêu nào chưa thanh toán (`UNSETTLED`) hay không.
- **Đề xuất sửa:** Kiểm tra `hasUnsettledExpenses(tripId)`. Nếu còn nợ, yêu cầu giải quyết trước hoặc chuyển chuyến đi sang trạng thái `ARCHIVED` / `CANCELLED`.

---

### VẤN ĐỀ P3 — LOW

#### [VISTA-FE-004] Chưa Có Modal Quét VietQR Trực Tiếp Trên Web
- **Mức độ:** P3 — Low
- **Thành phần:** Web UI
- **Luồng bị ảnh hưởng:** Luồng 6 (Ngân sách & Chi tiêu)
- **Bằng chứng:** Tại [DebtSettlementMatrix.tsx:160-165](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/features/budget/components/DebtSettlementMatrix.tsx#L160-L165), Web chỉ render dòng chữ tĩnh "Chưa trả" và nút "Xem chi tiết" mở modal thêm thành viên; trong khi Mobile có modal hiển thị QR Code chuẩn VietQR qua `img.vietqr.io`.
- **Đề xuất sửa:** Port component `VietQRModal` sang Web để hiển thị mã QR thanh toán ngân hàng trực tiếp.

#### [VISTA-FE-005] Polling Thông Báo 5s Cố Định Tại Navbar
- **Mức độ:** P3 — Low
- **Thành phần:** Web Architecture
- **Luồng bị ảnh hưởng:** Luồng 9 (Thông báo) & Hiệu năng
- **Bằng chứng:** Tại [Navbar.tsx:186](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/web/src/components/common/Navbar.tsx#L186), `setInterval(fetchInvites, 5000)` gọi định kỳ liên tục mỗi 5 giây.
- **Đề xuất sửa:** Nâng chu kỳ polling lên 30-60 giây và kích hoạt làm mới ngay khi cửa sổ nhận sự kiện focus (`window.addEventListener('focus')`).

#### [VISTA-BE-002] Chưa Tích Hợp Push Notification Gateway Thực Tế
- **Mức độ:** P3 — Low
- **Thành phần:** Backend Notification
- **Luồng bị ảnh hưởng:** Luồng 9 (Thông báo)
- **Bằng chứng:** Tại [DatabaseNotificationService.java:134-135](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/main/java/com/vista/notification/application/DatabaseNotificationService.java#L134-L135), mã nguồn vẫn để `// TODO: Tích hợp với Firebase Admin SDK` và mới chỉ in log console `[PUSH-DISPATCH]`.
- **Đề xuất sửa:** Cấu hình thư viện `firebase-admin` để gửi push thật đến token FCM của thiết bị di động.

#### [VISTA-TEST-002] Test Notification Thất Bại Do Chưa Mock Email Thành Viên B
- **Mức độ:** P3 — Low (Lỗi Test)
- **Thành phần:** Backend Integration Tests
- **Luồng bị ảnh hưởng:** Giai đoạn 7 (Đánh giá kiểm thử)
- **Bằng chứng:** [NotificationRealIntegrationTest.java:230](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/backend/src/test/java/com/vista/notification/NotificationRealIntegrationTest.java#L230) thất bại vì test case cũ chưa mock đối tượng UserEntity cho `USER_B`, dẫn đến bị quy tắc bảo mật `verifyInviteeEmail` trả về `403 Forbidden`.
- **Đề xuất sửa:** Bổ sung mock cho `userRepository.findById(USER_B)` trả về email `b@example.com` trong file test.

---

## 8. Ma Trận Luồng Nghiệp Vụ (Business Flow Matrix)

| Luồng nghiệp vụ | Web | Mobile | Backend | Database | Test Coverage | Trạng thái tổng thể |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Đăng ký & Đăng nhập** | ⚠️ Thiếu Auth Guard Middleware | ✅ Chuẩn | ✅ JWT + RateLimit | ✅ Users + Roles | 85% | ⚠️ **Cần sửa Middleware** |
| **2. Tạo & Quản lý chuyến đi** | ✅ Đã chuẩn hóa SSOT | ✅ Chuẩn | ⚠️ Thiếu JOIN FETCH (N+1) | ✅ Trips + Members | 90% | ⚠️ **Cần tối ưu Query** |
| **3. Lời mời tham gia chuyến đi** | ✅ Gọi API Backend thật | ✅ Chuẩn | ✅ verifyInviteeEmail (403) | ✅ trip_invitations | 95% | ✅ **Hoàn thiện SSOT** |
| **4. AI Planner** | ✅ Kết nối MasterPlanner | ✅ Chuẩn | ✅ FastAPI + Standalone | ❌ Giờ mở cửa lỗi | 80% | ❌ **Cần sửa Seed JSON** |
| **5. Bản đồ, GPS & Định tuyến** | ❌ Fallback vẽ đường cong ảo | ✅ Chuẩn | ✅ ORS + OSRM | ✅ POI Coordinates | 70% | ❌ **Sửa test & routing** |
| **6. Ngân sách & Chi tiêu** | ⚠️ Chưa có VietQR Modal | ✅ Có VietQR | ✅ VndSplitCalculator | ✅ Expenses + Splits | 90% | ⚠️ **Đồng bộ VietQR Web** |
| **7. Bình chọn & Đề xuất** | ❌ 100% Mock State | ✅ Chuẩn | ✅ Proposal/Vote API | ✅ Proposals/Votes | 60% | ❌ **Cần nối API Web** |
| **8. Cộng đồng & Kiểm duyệt** | ✅ Tương tác tốt | ✅ Chuẩn | ⚠️ Tự report được bài | ✅ Posts + Reports | 85% | ⚠️ **Chặn tự report** |
| **9. Thông báo** | ⚠️ Polling 5s dày đặc | ✅ Chuẩn | ⚠️ Chưa có FCM Push thật | ✅ Notifications | 80% | ⚠️ **Tối ưu Polling** |
| **10. Quản trị hệ thống (Admin)** | ❌ Bị hở Route Guard | N/A | ✅ hasRole('ADMIN') | ✅ Audit logs | 75% | ❌ **Chặn truy cập Web** |

---

## 9. Đánh Giá Bảo Mật & Rủi Ro Hệ Thống (Giai đoạn 4)

- **Authentication Bypass & Broken Access Control:** Phát hiện tại `web/src/middleware.ts`. Các trang quản trị hệ thống không thực hiện xác thực token ở tầng gateway frontend. Mặc dù backend có bảo vệ `@PreAuthorize("hasRole('ADMIN')")`, nhưng việc UI lộ toàn bộ cấu trúc dashboard cho người dùng vãng lai là rủi ro rò rỉ thông tin kiến trúc.
- **Quản lý khóa & Phiên làm việc (JWT Secrets):** Mặc định fallback secret quá dễ đoán nếu triển khai mà không set biến môi trường. Thời hạn Access Token 7 ngày là quá dài đối với chuẩn OAuth2/JWT hiện đại (chuẩn khuyến nghị: 15 - 30 phút).
- **Rò rỉ dữ liệu nhạy cảm:** Mật khẩu trong database đã được băm an toàn bằng BCrypt (cost factor 10 & 12). Log hệ thống đã áp dụng regex che giấu thông tin `[REDACTED]` đối với password và token.
- **SQL / JPQL Injection:** Không phát hiện lỗ hổng chèn mã SQL. Toàn bộ các truy vấn Spring Data JPA và JdbcClient đều sử dụng tham số hóa (`:param` hoặc `?`).

---

## 10. Đánh Giá Cơ Sở Dữ Liệu & Tính Toàn Vẹn Dữ Liệu (Giai đoạn 5)

Qua kiểm tra đối soát trực tiếp giữa **SQLite (`database/vista_destinations.db`)**, **Backend Seed CSV** và **Frontend Data**:
- Tổng số lượng địa điểm đồng nhất tuyệt đối: **2,294 địa điểm** trên toàn bộ 63 tỉnh thành.
- Không có tọa độ nào nằm ngoài lãnh thổ Việt Nam ($8.0 \le \text{lat} \le 24.0$, $102.0 \le \text{lng} \le 110.0$).
- Không có bản ghi nào bị giá tối thiểu lớn hơn giá tối đa (`price_min > price_max`).
- **Điểm bất thường lớn nhất:** Có tới **1,594 / 2,294 (69.5%) địa điểm** có định dạng giờ mở cửa không đầy đủ 7 ngày (hoặc để trống, hoặc dùng định dạng chuỗi đơn giản `"08:00-18:00"`).

---

## 11. Đánh Giá Hợp Đồng API (OpenAPI & Schemas)

- Bộ OpenAPI contract tại `contracts/openapi/openapi.yaml` đạt chuẩn lint của Redocly CLI.
- Các kiểu dữ liệu sinh tự động (`api.generated.ts`) giữa Web và Mobile hoàn toàn khớp với hợp đồng chung.
- **Điểm lệch pha:** Schema định nghĩa `RouteResult` có trường `source` và `legs` có sự khác biệt nhỏ về tên trường tóm tắt thời gian giữa Proxy Next.js (`durationMin`) và Backend (`durationMillis`).

---

## 12. Phân Loại Nguyên Nhân Test Thất Bại (Giai đoạn 7)

| Test thất bại | Thành phần | Phân loại | Nguyên nhân gốc | Hướng xử lý |
|---|---|---|---|---|
| `test-route-planner.mjs:49` | Web Map Routing | **Lỗi production code & Test không khớp** | `computeVistaRoute` âm thầm nuốt lỗi 503 và tự vẽ đường thay vì trả lỗi cho caller. | Sửa `computeVistaRoute` trả đúng ngoại lệ khi backend 503. |
| `OpeningHoursValidationTest:72` | Backend Seed Data | **Lỗi dữ liệu (Data anomaly)** | Địa điểm `châu battery power` có JSON `{"open":"..","close":".."}`. | Sửa bản ghi trong file CSV thành chuẩn 7 ngày. |
| `NotificationRealIntegrationTest:230` | Backend Integration | **Lỗi test (Test lỗi thời)** | Test case chưa cập nhật theo quy tắc bảo mật mới `verifyInviteeEmail`. | Bổ sung mock email người dùng B vào file test. |

---

## 13. Nợ Kỹ Thuật (Technical Debt)

1. **Thiếu cơ chế Push Notification thực:** Thiết bị di động hiện tại chưa nhận được thông báo ngoài màn hình khóa khi app chạy nền.
2. **Kích thước file mã nguồn quá lớn:** Một số tệp tin giao diện (như `trips/[tripId]/page.tsx` hơn 4,000 dòng, `planner/page.tsx` hơn 8,000 dòng) tích tụ quá nhiều logic nghiệp vụ, gây khó khăn cho việc kiểm thử đơn vị và bảo trì.
3. **Chưa có công cụ dọn dẹp bộ nhớ đệm tự động:** Mặc dù các file store giả lập đã bị xóa bỏ, trình duyệt người dùng cũ vẫn còn lưu các khóa rác trong `localStorage`.

---

## 14. Kế Hoạch Xử Lý Theo Thứ Tự Ưu Tiên (Action Plan)

### Đợt 1: Xử lý các điểm nghẽn P0 & P1 (Khuyến nghị thực hiện ngay)
1. **[P0] Khắc phục `web/src/middleware.ts`:** Thêm logic kiểm tra cookie `vista_token` và giải mã role, redirect các request không có quyền về `/login`.
2. **[P1] Sửa lỗi dữ liệu giờ mở cửa Backend Seed:** Cập nhật bản ghi `châu battery power` và các điểm bị thiếu để `OpeningHoursValidationTest` chuyển sang màu Xanh.
3. **[P1] Sửa lỗi Typecheck trên Mobile:** Đổi `StyleSheet.absoluteFillObject` $\rightarrow$ `StyleSheet.absoluteFill`, ép kiểu `PermissionStatus` chuẩn trong test.
4. **[P1] Chuẩn hóa Map Routing Fallback:** Sửa `routes.ts` để ném lỗi rõ ràng khi không có dịch vụ định tuyến, sửa `test-route-planner.mjs` đạt kết quả PASS.
5. **[P1] Đấu nối API thật cho Tab Biểu quyết trên Web:** Thay thế `getSampleProposals` bằng các lời gọi `apiRequest` tới `/api/v1/trips/{tripId}/proposals`.

### Đợt 2: Tối ưu bảo mật, dữ liệu và hiệu năng P2
1. **[P2] Thêm `LEFT JOIN FETCH` vào `TripRepository`:** Triệt tiêu hoàn toàn lỗi N+1 Query.
2. **[P2] Điều chỉnh cấu hình JWT:** Đặt thời hạn Access Token còn 30 phút, bắt buộc đặt biến môi trường cho Secret Key trên môi trường Production.
3. **[P2] Chặn tự báo cáo vi phạm:** Thêm validate `postAuthor != reporterId` trong `ReportService.java`.
4. **[P2] Cấu hình bỏ qua vendor worker trong ESLint:** Thêm `maplibre-gl-worker.mjs` vào file cấu hình ignore.

### Đợt 3: Hoàn thiện trải nghiệm P3 & Nợ kỹ thuật
1. **[P3] Bổ sung Modal VietQR trên Web:** Mang trải nghiệm quét mã thanh toán từ Mobile lên Web.
2. **[P3] Chuyển đổi Polling sang SSE hoặc nâng chu kỳ polling lên 30s-60s.**

---

## 15. Quick Wins (Có Thể Sửa Trong 15 Phút)

- **Quick Win 1:** Sửa 2 dòng lỗi TypeScript trong `mobile/src/features/community/CommunityTools.tsx` và file test liên quan $\rightarrow$ Quality Gate Typecheck Mobile xanh ngay lập tức.
- **Quick Win 2:** Bổ sung `web/public/map-assets/**` vào file `web/.eslintignore` hoặc `web/eslint.config.mjs` $\rightarrow$ Xóa sổ 5,875 warning/error giả lập của Linter.
- **Quick Win 3:** Sửa giá trị JSON của `châu battery power` trong `backend/src/main/resources/db/seed/demo_destinations_seed.csv` $\rightarrow$ `OpeningHoursValidationTest` pass ngay lập tức.
- **Quick Win 4:** Bổ sung mock cho `USER_B` trong `NotificationRealIntegrationTest.java` $\rightarrow$ Toàn bộ 537 test backend đạt 100% tỷ lệ đỗ.

---

## 16. Tiêu Chí Nghiệm Thu Sau Khi Khắc Phục (Acceptance Criteria)

- [ ] Lệnh `npm run typecheck --prefix mobile` thoát với mã 0 (Zero errors).
- [ ] Lệnh `npm run lint --prefix web` thoát với mã 0.
- [ ] Lệnh `npm run test --prefix web` pass 100% các script test bản đồ và API auth.
- [ ] Lệnh `.\gradlew.bat test` trên Backend hoàn thành 537/537 tests với 0 failures.
- [ ] Truy cập `http://localhost:3000/dashboard` bằng trình duyệt ẩn danh phải bị điều hướng về `/login`.
- [ ] Tab Biểu quyết trên Web tạo được đề xuất và lưu thành công vào PostgreSQL.

---

## 17. Phụ Lục Lệnh Đã Chạy Trong Quá Trình Audit

```bash
# 1. Kiểm tra chất lượng Web
npm run lint --prefix web
npm run test --prefix web
node web/node_modules/typescript/bin/tsc -p web/tsconfig.json --noEmit

# 2. Kiểm tra chất lượng Mobile
npm run typecheck --prefix mobile
npm run test --prefix mobile

# 3. Kiểm tra chất lượng Backend
.\backend\gradlew.bat -p backend test
.\backend\gradlew.bat -p backend test --tests com.vista.destination.domain.OpeningHoursValidationTest
.\backend\gradlew.bat -p backend test --tests com.vista.notification.NotificationRealIntegrationTest

# 4. Kiểm tra Hợp đồng OpenAPI
npm run api:validate --prefix contracts
npm run api:check --prefix contracts

# 5. Đối soát toàn vẹn dữ liệu SQLite & CSV
python -c "import sqlite3; conn = sqlite3.connect('database/vista_destinations.db'); print(conn.cursor().execute('SELECT count(*) FROM destinations').fetchone())"
```
