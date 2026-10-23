# ADR 006 Cơ chế kiểm soát quyền truy cập chuyến đi và dữ liệu riêng tư (D2)

> **Trạng thái:** PENDING TEAM APPROVAL (Đề xuất chờ nhóm và TV1 phê duyệt)  
> **Người đề xuất:** TV2 (Backend Core & Trip Owner)  
> **Ngày:** 2026-10-19  

---

## 1. Bối cảnh & Nguyên tắc cốt lõi (D2)

Theo Kế hoạch 8 tuần và Kiến trúc Modular Monolith ([docs/architecture/module-boundaries.md](../architecture/module-boundaries.md)):
1. **Mobile không bao giờ truy vấn trực tiếp cơ sở dữ liệu:** Toàn bộ thao tác nghiệp vụ phải đi qua REST API của Spring Boot.
2. **Hàng rào phòng thủ 2 lớp (Defense-in-Depth):**
   - **Lớp 1 (Ứng dụng - Bắt buộc):** Spring Boot kiểm tra quyền logic thông qua interface công khai `TripAccessService` và Spring Security `@PreAuthorize`.
   - **Lớp 2 (Cơ sở dữ liệu - Phòng ngừa):** Row Level Security (RLS) trên PostgreSQL cho các bảng nhạy cảm.

---

## 2. Thiết kế chi tiết Interface `TripAccessService`

Mã nguồn tại: `backend/src/main/java/com/vista/trip/application/TripAccessService.java`.

Các phương thức cam kết:
```java
public interface TripAccessService {
  boolean isMember(UUID tripId, UUID userId);
  boolean isOwner(UUID tripId, UUID userId);
  void requireMember(UUID tripId, UUID userId);
  void requireOwner(UUID tripId, UUID userId);
}
```

### Quy tắc bất biến giữa các Actor:
- **TV3 (Itinerary / Voting / Invitations):** Trước khi thêm điểm dừng hoặc bỏ phiếu, BẮT BUỘC gọi `tripAccessService.requireMember(tripId, currentUserId)`.
- **TV4 (Expenses / Budget):** Trước khi thêm khoản chi tiêu nhóm, BẮT BUỘC gọi `tripAccessService.requireMember(tripId, currentUserId)`.
- **TV5 (Safety / Location):** Trước khi truy vấn vị trí thành viên nhóm, BẮT BUỘC gọi `tripAccessService.requireMember(tripId, currentUserId)`.
- **Tuyệt đối cấm:** Các module ngoài TV2 tự inject `TripRepository` hay truy vấn bảng `trips` / `trip_members`.

### Chi tiết triển khai kỹ thuật (`DatabaseTripAccessService`):
1. **Xác thực Chủ sở hữu (`isOwner`):**
   - Bước 1: Kiểm tra `trips.owner_id = userId`.
   - Bước 2: Kiểm tra bản ghi trong `trip_members` với `trip_id = tripId`, `user_id = userId`, `role = 'OWNER'`, `status = 'ACTIVE'`.
   - Cả 2 điều kiện phải thỏa mãn. Nếu `trips.owner_id` khớp nhưng thiếu bản ghi `OWNER/ACTIVE`, hệ thống ghi log cảnh báo dữ liệu không nhất quán và trả về `false`.
2. **Xác thực Thành viên (`isMember`):**
   - Trả về `true` nếu `isOwner(tripId, userId)` là `true`.
   - Hoặc kiểm tra `trip_members` có bản ghi với `status = 'ACTIVE'`.
   - Các trạng thái `PENDING`, `REMOVED` tuyệt đối không được cấp quyền.
3. **Bất biến khi tạo chuyến đi (Trip Creation Invariant):**
   - Khi tạo chuyến đi, BẮT BUỘC trong cùng một transaction `@Transactional` thực hiện đồng thời:
     - Thêm bản ghi `trips` với `owner_id = currentUserId`.
     - Thêm bản ghi `trip_members` với `user_id = owner_id`, `role = 'OWNER'`, `status = 'ACTIVE'`.
4. **Chính sách ngoại lệ và bảo vệ lỗi tầng cơ sở dữ liệu:**
   - Khi `tripId` hoặc `userId` là `null`: Các hàm kiểm tra trả về `false`, các hàm yêu cầu (`requireMember`, `requireOwner`) ném `IllegalArgumentException`.
   - Lỗi cơ sở dữ liệu (`DataAccessException`): Tuyệt đối KHÔNG được nuốt (swallow) exception để trả về `false`. Ngoại lệ phải được lan truyền để `GlobalExceptionHandler` trả về HTTP 500 (`INTERNAL_ERROR`), tránh nhầm lẫn sang lỗi phân quyền 403.
   - Thất bại phân quyền: Ném `AccessDeniedException` kèm thông điệp rõ ràng, trả về HTTP 403 Forbidden.

---

## 3. Quy ước mã lỗi và xử lý ngoại lệ

1. Khi người dùng cố tình truy cập chuyến đi mà mình **không phải thành viên**:
   - Nếu chuyến đi ở chế độ `PRIVATE`: Trả về **HTTP 403 Forbidden** (hoặc **HTTP 404 Not Found** đối với các endpoint nhạy cảm để ngăn chặn tấn công dò quét ID chuyến đi - IDOR Enumeration).
2. Khi thành viên thông thường (Member) cố thực hiện quyền của Chủ nhóm (Owner) như đổi thông tin chuyến đi, xóa thành viên, hủy trip:
   - Trả về **HTTP 403 Forbidden** kèm RFC 9457 Problem Details với mã lỗi `FORBIDDEN` hoặc `INSUFFICIENT_TRIP_PERMISSION`.
3. Định dạng lỗi trả về thống nhất qua `GlobalExceptionHandler`:
   ```json
   {
     "type": "https://vista.example/errors/forbidden",
     "title": "Forbidden",
     "status": 403,
     "detail": "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này",
     "instance": "/api/v1/trips/0192a5b0-1234-789a-bcde-000000000001",
     "code": "FORBIDDEN",
     "requestId": "0256adbd-90df-437e-9db3-0fe66932bd1e"
   }
   ```

---

## 4. Các điểm cần nhóm xác nhận

1. Thống nhất phương án ẩn ID: Với chuyến đi PRIVATE, khi non-member truy vấn `GET /trips/{id}`, nên trả về 403 rõ ràng hay 404 (Not Found)?
2. Thống nhất mở rộng vai trò trong tương lai: Hiện tại dự án đã chuẩn hóa thống nhất toàn diện trên bộ đôi `OWNER` và `MEMBER` (khớp với enum `TripRole`, cột `trip_members.role`, `DatabaseTripAccessService` và `rbac-matrix.md`). Nếu các tuần sau cần vai trò `CO_HOST` (Phó nhóm), nhóm sẽ thảo luận để bổ sung thêm vào enum và ma trận.



