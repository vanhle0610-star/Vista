# MA TRẬN PHÂN QUYỀN HỆ THỐNG VÀ CHUYẾN ĐI (RBAC MATRIX)

> **Mã công việc:** W1-03  
> **Người phụ trách:** M1 (BA / PM / QA)  
> **Xác nhận kỹ thuật:** M2 (Backend Core), M3 (Backend Trip)

---

## 1. MÔ HÌNH PHÂN QUYỀN 2 TẦNG (TWO-TIER AUTHORIZATION)

Hệ thống VISTA áp dụng mô hình phân quyền kết hợp:
1. **Global Roles (Vai trò toàn cục):** Quản lý mức độ truy cập tài nguyên toàn hệ thống (`GUEST`, `USER`, `MODERATOR`, `ADMIN`).
2. **Trip Context Roles (Vai trò theo chuyến đi):** Phân quyền động bên trong một chuyến đi cụ thể (`OWNER`, `MEMBER`, `NON_MEMBER`).

---

## 2. MA TRẬN PHÂN QUYỀN TOÀN CỤC (GLOBAL ROLES)

| Nhóm chức năng | Hành động chi tiết | GUEST | USER | MODERATOR | ADMIN |
|---|---|:---:|:---:|:---:|:---:|
| **Xác thực & Hồ sơ** | Đăng ký / Đăng nhập | ✅ | ❌ | ❌ | ❌ |
| | Xem thông tin công khai hệ thống (`/health`) | ✅ | ✅ | ✅ | ✅ |
| | Xem & sửa hồ sơ cá nhân (`/users/me`) | ❌ | ✅ | ✅ | ✅ |
| | Yêu cầu xóa tài khoản | ❌ | ✅ | ✅ | ✅ |
| | Quản lý người dùng & khóa tài khoản | ❌ | ❌ | ❌ | ✅ |
| **Khám phá điểm đến** | Tìm kiếm & lọc điểm đến (`Published`) | ✅ | ✅ | ✅ | ✅ |
| | Xem chi tiết địa điểm du lịch | ✅ | ✅ | ✅ | ✅ |
| | Lưu / Bỏ lưu địa điểm yêu thích (`Favorites`) | ❌ | ✅ | ✅ | ✅ |
| | Tạo mới, sửa, xóa điểm đến du lịch | ❌ | ❌ | ❌ | ✅ |
| **Cộng đồng** | Xem bảng tin & bài viết công khai | ✅ | ✅ | ✅ | ✅ |
| | Đăng bài viết, viết bình luận, đánh giá sao | ❌ | ✅ | ✅ | ✅ |
| | Báo cáo nội dung vi phạm (`Report`) | ❌ | ✅ | ✅ | ✅ |
| | Xử lý báo cáo, ẩn bài viết vi phạm | ❌ | ❌ | ✅ | ✅ |
| **Hệ thống** | Xem nhật ký kiểm toán (`Audit Logs`) | ❌ | ❌ | ❌ | ✅ |

---

## 3. MA TRẬN PHÂN QUYỀN TRONG CHUYẾN ĐI (TRIP CONTEXT ROLES)

Chỉ áp dụng khi người dùng đã đăng nhập (`USER`).

| Nghiệp vụ chuyến đi | Hành động cụ thể | NON_MEMBER | MEMBER | OWNER |
|---|---|:---:|:---:|:---:|
| **Thông tin chuyến đi** | Xem tổng quan chuyến đi (`PRIVATE`) | ❌ (Trả về 403) | ✅ | ✅ |
| | Cập nhật tiêu đề, ngày đi, mô tả trip | ❌ | ❌ | ✅ |
| | Xóa hoặc hủy chuyến đi | ❌ | ❌ | ✅ |
| **Thành viên & Lời mời** | Tạo link mời tham gia chuyến đi | ❌ | ❌ | ✅ |
| | Chấp nhận / Từ chối lời mời | ✅ (Nếu có link) | ❌ | ❌ |
| | Xóa thành viên khỏi chuyến đi | ❌ | ❌ | ✅ |
| | Tự rời khỏi chuyến đi | ❌ | ✅ | ❌ (Phải chuyển Owner) |
| **Lịch trình theo ngày** | Xem lịch trình các ngày | ❌ | ✅ | ✅ |
| | Thêm điểm dừng mới vào ngày | ❌ | ✅ | ✅ |
| | Sắp xếp lại thứ tự điểm dừng | ❌ | ✅ | ✅ |
| | Xóa điểm dừng khỏi lịch trình | ❌ | ✅ | ✅ |
| **Đề xuất & Biểu quyết** | Đề xuất địa điểm vào danh sách chờ | ❌ | ✅ | ✅ |
| | Biểu quyết Up/Down cho đề xuất | ❌ | ✅ | ✅ |
| | Chốt đề xuất đưa vào lịch trình chính thức | ❌ | ❌ | ✅ |
| **Ngân sách & Chi phí** | Ghi nhận khoản chi tiêu nhóm mới | ❌ | ✅ | ✅ |
| | Sửa / Xóa khoản chi của chính mình | ❌ | ✅ (Của mình) | ✅ |
| | Xem danh sách chi phí & bảng chia tiền | ❌ | ✅ | ✅ |
| **An toàn & Vị trí** | Bật / Tắt chia sẻ vị trí của bản thân (Opt-in) | ❌ | ✅ | ✅ |
| | Xem vị trí các thành viên đang bật chia sẻ | ❌ | ✅ | ✅ |
| | Tạo điểm hẹn tập trung (`Meetup point`) | ❌ | ✅ | ✅ |
| | Gửi tín hiệu cảnh báo khẩn cấp (`SOS Alert`) | ❌ | ✅ | ✅ |

---

## 4. QUY TẮC CÀI ĐẶT TRÊN BACKEND (M2, M3 LƯU Ý)

1. **Spring Security Method Security:**
   - Dùng `@PreAuthorize("hasRole('ADMIN')")` cho các API quản trị nội dung.
   - Dùng `@PreAuthorize("@tripSecurity.isOwner(#tripId, authentication.name)")` cho quyền Owner chuyến đi.
   - Dùng `@PreAuthorize("@tripSecurity.isMember(#tripId, authentication.name)")` cho quyền Member chuyến đi.
2. **Bảo mật tuyệt đối:** Người ngoài chuyến đi (`NON_MEMBER`) truy cập vào API Trip trả về **HTTP 403 Forbidden** hoặc **HTTP 404 Not Found** (để tránh rò rỉ ID chuyến đi bí mật).
