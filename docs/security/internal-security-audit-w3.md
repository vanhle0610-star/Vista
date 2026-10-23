# BÁO CÁO RÀ SOÁT BẢO MẬT NỘI BỘ LẦN 1 — TUẦN 3 (W3-TV2-04)

> **Mã công việc:** W3-TV2-04  
> **Người thực hiện:** TV2 (Backend Core & Security Lead)  
> **Ngày thực hiện:** 2026-10-21  
> **Phiên bản:** 1.0  
> **Trạng thái:** COMPLETED — BÀN GIAO CHO NHÓM ĐÁNH GIÁ CỔNG W3  

---

## 1. MỤC TIÊU VÀ PHẠM VI RÀ SOÁT

Theo kế hoạch 8 tuần của dự án VISTA ([`Vista_KeHoach_8Tuan_TheoActor_v2.docx`](../../Vista_KeHoach_8Tuan_TheoActor_v2.docx)), đợt **Rà soát bảo mật nội bộ lần 1** diễn ra vào cuối Tuần 3 nhằm:
1. Rà soát toàn bộ các REST endpoint đã công bố và triển khai trong backend Spring Boot.
2. Kiểm tra xác thực (Authentication), phân quyền (Authorization) và phòng chống lỗ hổng truy cập trực tiếp đối tượng không an toàn (**IDOR**).
3. Đảm bảo dữ liệu riêng tư của chuyến đi (**BR-02**) được bảo vệ nghiêm ngặt ở tầng ứng dụng và cơ sở dữ liệu.
4. Đảm bảo dữ liệu nhạy cảm (mật khẩu, token, secret) không bị rò rỉ qua response JSON hoặc nhật ký kiểm toán ([`audit_logs`](../../backend/src/main/java/com/vista/common/audit/domain/AuditLogEntity.java)).

---

## 2. MA TRẬN KIỂM TOÁN ENDPOINT (ENDPOINT AUDIT MATRIX)

| STT | Endpoint | Method | Vai trò yêu cầu | Cơ chế kiểm soát | Trạng thái IDOR | Đánh giá | Người chịu trách nhiệm |
|:---:|---|:---:|:---:|---|:---:|:---:|:---:|
| 1 | `/api/v1/auth/register` | POST | Public | Rate-limited (10 req/min), BCrypt 12, Email uniqueness | N/A | **PASS** | TV2 |
| 2 | `/api/v1/auth/login` | POST | Public | Rate-limited (5 fail/5 min), Thông báo lỗi chung | N/A | **PASS** | TV2 |
| 3 | `/api/v1/auth/refresh` | POST | Public | Token hashing SHA-256, kiểm tra revoked, gia hạn 7 ngày | N/A | **PASS** | TV2 |
| 4 | `/api/v1/auth/logout` | POST | Public | Thu hồi `refresh_token` trong DB | N/A | **PASS** | TV2 |
| 5 | `/api/v1/auth/google` | POST | Public | Xác thực token qua Google API client | N/A | **PASS** | TV2 |
| 6 | `/api/v1/health` | GET | Public | Không chứa thông tin hạ tầng nội bộ | N/A | **PASS** | TV2 |
| 7 | `/api/v1/destinations/**` | GET | Public | Chỉ trả dữ liệu trạng thái `Published` | N/A | **PASS** | TV1 |
| 8 | `/api/v1/users/me` | GET | USER | Lấy ID trực tiếp từ JWT `SecurityContext` | **Chống IDOR** | **PASS** | TV2 |
| 9 | `/api/v1/users/me` | PATCH | USER | Chỉ cho phép sửa profile của user đang đăng nhập | **Chống IDOR** | **PASS** | TV2 |
| 10 | `/api/v1/trips` | POST | USER | Người tạo tự động gắn làm `OWNER` trong transaction | N/A | **PASS** | TV2 |
| 11 | `/api/v1/trips` | GET | USER | Lấy theo `findActiveTripsByUserId`, chỉ thấy trip mình tham gia | **Chống IDOR** | **PASS** | TV2 |
| 12 | `/api/v1/trips/{id}` | GET | MEMBER/OWNER | `tripAccessService.requireMember(tripId, userId)` (403 nếu ngoài nhóm) | **Chống IDOR** | **PASS** | TV2 |
| 13 | `/api/v1/trips/{id}` | PATCH | OWNER | `tripAccessService.requireOwner(tripId, userId)` (403 nếu không phải Owner) | **Chống IDOR** | **PASS** | TV2 |
| 14 | `/api/v1/trips/{id}/members` | GET | MEMBER/OWNER | `tripAccessService.requireMember(tripId, userId)` (403 nếu ngoài nhóm) | **Chống IDOR** | **PASS** | TV2 |
| 15 | `/api/v1/admin/**` | ANY | ADMIN | `hasRole('ADMIN')` trên toàn bộ filter chain | N/A | **PASS** | TV2 |

---

## 3. PHÂN TÍCH CHI TIẾT CÁC VẤN ĐỀ AN TOÀN BẢO MẬT

### 3.1. Xác thực & Quản lý Token (Authentication & Token Security)
- **Điểm mạnh:**
  - Token ký bằng thuật toán HMAC-SHA256 với secret key tối thiểu 256 bits ([`JwtTokenService.java`](../../backend/src/main/java/com/vista/auth/application/JwtTokenService.java)).
  - Access token có thời hạn ngắn (15 phút), Refresh token lưu dưới dạng hash SHA-256 trong database với thời hạn 7 ngày.
  - Rate limiting hoạt động hiệu quả trên `/auth/login` và `/auth/register` qua [`LoginRateLimiter.java`](../../backend/src/main/java/com/vista/auth/application/LoginRateLimiter.java).
- **Phát hiện & Khắc phục ở Tuần 3:**
  - Trước đây màn hình Mobile bỏ qua việc lưu trữ token. TV2 đã triển khai [`authStorage.ts`](../../mobile/src/services/auth/authStorage.ts) sử dụng `expo-secure-store` mã hóa phần cứng trên thiết bị và gắn axios interceptor tự động truyền `Bearer token`.

### 3.2. Phòng chống IDOR & Kiểm soát truy cập chuyến đi (BR-02 Enforcement)
- **Quy tắc BR-02:** *"Chỉ thành viên của chuyến đi mới được đọc dữ liệu riêng tư của chuyến đi; chặn người ngoài đọc trip."*
- **Kiểm chứng thực tế:**
  - Tầng Controller hoàn toàn không tin tưởng `userId` hoặc `role` từ client gửi lên; mọi định danh người dùng đều trích xuất từ JWT token đã được verify chữ ký.
  - Phương thức `requireMember` và `requireOwner` trong [`DatabaseTripAccessService.java`](../../backend/src/main/java/com/vista/trip/application/DatabaseTripAccessService.java) truy vấn trực tiếp bảng `trips` và `trip_members` để xác thực quan hệ trước khi trả dữ liệu.
  - Người dùng ngoài nhóm khi gọi `GET /trips/{id}` hoặc `GET /trips/{id}/members` lập tức nhận mã phản hồi **`403 Forbidden`** chuẩn RFC 7807 ProblemDetails.

### 3.3. Bảo vệ dữ liệu nhạy cảm (Data Exposure & Sanitization)
- **Hồ sơ người dùng:**
  - Entity [`UserEntity.java`](../../backend/src/main/java/com/vista/user/domain/UserEntity.java) chứa trường `password_hash`. DTO [`UserResponse.java`](../../backend/src/main/java/com/vista/auth/api/dto/UserResponse.java) và [`TripMemberResponse.java`](../../backend/src/main/java/com/vista/trip/api/dto/TripMemberResponse.java) tuyệt đối không map trường mật khẩu này ra ngoài.
- **Xử lý lỗi hệ thống:**
  - Cấu hình Spring Boot `server.error.include-stacktrace: never` và [`GlobalExceptionHandler.java`](../../backend/src/main/java/com/vista/common/web/GlobalExceptionHandler.java) bắt toàn bộ Exception chưa xác định, trả về thông báo chung *"Đã xảy ra lỗi không mong đợi"*, ngăn lộ thông tin cấu trúc code và SQL internal ra client.
- **Khử khuẩn Audit Log ([`DatabaseAuditLogService.java`](../../backend/src/main/java/com/vista/common/audit/application/DatabaseAuditLogService.java)):**
  - Tích hợp hàm `sanitize()` tự động quét và che giấu các trường nhạy cảm (`password`, `token`, `secret`, `authorization`) trước khi ghi vào cột `metadata_json` của bảng `audit_logs`.

---

## 4. DANH SÁCH LỖ HỔNG & NHIỆM VỤ GÁN XỬ LÝ (ACTION ITEMS)

| ID | Vấn đề phát hiện | Mức độ rủi ro | Khuyến nghị khắc phục | Phân công | Hạn hoàn thành |
|:---:|---|:---:|---|:---:|:---:|
| **SEC-01** | Chưa kích hoạt Row Level Security (RLS) ở mức Database Supabase | **Medium** | DDL migration hiện tại dựa 100% vào logic Spring Boot; cần viết migration bổ sung RLS policies cho bảng `trips`, `trip_members`, `expenses` làm lớp phòng thủ thứ 2 (D2) | **TV2** | Tuần 6 (Theo kế hoạch W6) |
| **SEC-02** | Thiếu cơ chế tự động refresh token ngầm khi 401 trên Mobile | **Medium** | Bổ sung axios response interceptor bắt mã 401 để tự động gọi `/api/v1/auth/refresh` bằng refresh token đã lưu trong SecureStore | **TV2** | Tuần 4 |
| **SEC-03** | Khách truy cập (Public) xem danh sách địa điểm cần kiểm tra status `Published` | **Low** | Đảm bảo module `destination` của TV1 luôn kiểm tra `status = 'Published'` trong truy vấn để không lộ địa điểm nháp | **TV1** | Tuần 4 |
| **SEC-04** | API thêm chi phí (`/trips/{id}/expenses`) của TV4 cần gọi `TripAccessService` | **High** | Khi TV4 triển khai Expense API ở W3–W4, bắt buộc gọi `tripAccessService.requireMember(tripId, userId)` trước khi ghi nhận tiền | **TV4** | Tuần 4 |

---

## 5. KẾT LUẬN ĐỢT RÀ SOÁT LẦN 1

- Hệ thống Backend hiện tại đáp ứng đầy đủ các tiêu chuẩn bảo mật cho giai đoạn MVP Tuần 3:
  - **Không có lỗ hổng IDOR nghiêm trọng.**
  - **Quy tắc BR-02 được thực thi và có 95 test tự động kiểm chứng.**
  - **Dữ liệu nhạy cảm được che giấu và khử khuẩn an toàn.**
- Đủ điều kiện bảo mật để thông qua **Cổng kiểm soát Tuần 3 (W3 Acceptance Gate)**.

