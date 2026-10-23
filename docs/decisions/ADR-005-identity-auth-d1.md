# ADR 005 Cơ chế xác thực và quản lý danh tính người dùng (D1)

> **Trạng thái:** PENDING TEAM APPROVAL (Đề xuất chờ nhóm và TV1 phê duyệt)  
> **Người đề xuất:** TV2 (Backend Core & Identity)  
> **Ngày:** 2026-10-19  

---

## 1. Bối cảnh & Vấn đề

Trong tài liệu Kế hoạch 8 tuần ([actor-implementation-plan-8weeks.md](../requirements/actor-implementation-plan-8weeks.md)), quyết định D1 ghi:
> *"Supabase Auth cấp JWT; Spring Boot là resource server xác thực JWT; Mobile lưu an toàn qua Expo SecureStore."*

Tuy nhiên, trong mã nguồn thực tế hiện tại:
1. `contracts/openapi/openapi.yaml` định nghĩa trực tiếp 3 endpoint xác thực do backend Spring Boot đảm nhiệm:
   - `POST /api/v1/auth/register` (FR-AUTH-01)
   - `POST /api/v1/auth/login` (FR-AUTH-02)
   - `POST /api/v1/auth/refresh` (FR-AUTH-03)
2. `backend/.env.example` khai báo biến bí mật đối xứng `JWT_SIGNING_KEY`.
3. `backend/src/main/java/com/vista/auth/api/dto/` đã có sẵn các DTO: `LoginRequest`, `RegisterRequest`, `AuthResponse`.
4. Dự án Supabase Demo dùng chung chưa hoàn tất thiết lập tài khoản và JWKS URL ([week-1-gap-report.md](../requirements/week-1-gap-report.md)).

Điều này dẫn đến sự không thống nhất giữa kế hoạch lý thuyết (D1) và hiện trạng code/contract.

---

## 2. So sánh các phương án kiến trúc

| Tiêu chí | Phương án A: Supabase Auth (Ủy quyền hoàn toàn) | Phương án B: Spring Boot Self-Issued JWT (Nội bộ) |
|---|---|---|
| **Cơ chế phát hành** | Mobile SDK gọi trực tiếp Supabase Auth API để đăng ký/đăng nhập/refresh token. | Mobile gửi yêu cầu tới Spring Boot API (`/api/v1/auth/*`), backend tự băm mật khẩu (BCrypt 12) và ký JWT. |
| **Vai trò Spring Boot** | Resource Server: Chỉ nhận Bearer token và verify bất đối xứng qua JWKS (Public Key) của Supabase. | Auth Server & Resource Server: Tự cấp phát Access Token (15 phút) và Refresh Token (7 ngày) dùng secret key. |
| **Phụ thuộc hạ tầng** | Phụ thuộc 100% vào kết nối internet tới Supabase Cloud; local dev cần Supabase CLI/Docker emulator. | 100% độc lập, chạy offline hoàn toàn trên PostgreSQL local. |
| **Khớp với OpenAPI** | Xung đột: Các endpoint `/auth/login`, `/auth/register` trong `contracts/` sẽ trở nên thừa. | Khớp 100% với `contracts/openapi/openapi.yaml` và các DTO có sẵn trong repo. |
| **Tương thích RLS** | Rất tốt: `auth.uid()` của Supabase PostgreSQL tự động nhận diện người dùng. | Cần Spring Boot truyền `app.current_user_id` vào session DB nếu muốn RLS hoạt động đồng thời. |

---

## 3. Phương án đề xuất (TV2 Recommendation)

TV2 đề xuất lộ trình 2 giai đoạn (Hybrid Transition):

1. **Giai đoạn 1 (Tuần 1 & 2 - Local First):**
   - Triển khai **Phương án B (Self-issued JWT)** trên Spring Boot với cấu trúc claims tiêu chuẩn:
     ```json
     {
       "sub": "user-uuid",
       "email": "user@example.com",
       "roles": ["ROLE_USER"],
       "iss": "vista-backend",
       "exp": 1729340000
     }
     ```
   - Điều này giúp TV1, TV3, TV4, TV5 và Mobile có thể test đăng nhập, route guard và gọi API ngay lập tức trên môi trường local mà không bị chặn bởi tiến độ cấu hình Supabase Cloud.

2. **Giai đoạn 2 (Tuần 3 trở đi - Supabase Integration):**
   - Khi TV1/quản trị viên hoàn tất cấu hình Supabase Project, backend bổ sung `JwtAuthenticationConverter` để giải mã song song token từ Supabase Auth JWKS.

---

## 4. Các câu hỏi cần cả nhóm chốt

1. Nhóm có đồng ý để TV2 triển khai Auth Controller nội bộ theo Phương án B cho Tuần 2 trước không?
2. Thời hạn token: Thống nhất Access Token = 15 phút, Refresh Token = 7 ngày theo SRS hay có điều chỉnh?

