# USER STORIES & ACCEPTANCE CRITERIA (GIVEN / WHEN / THEN) — TUẦN 1

> **Mã công việc:** W1-05  
> **Người phụ trách:** M1 (BA / PM / QA)  
> **Phạm vi:** Phục vụ phát triển cho Tuần 2 (Auth: `FR-AUTH-01→05` và Khám phá: `FR-DEST-01→05`)

---

## 1. LUỒNG XÁC THỰC & TÀI KHOẢN (AUTH & USER)

### US-AUTH-01: Đăng ký tài khoản mới (FR-AUTH-01)
> **Là một** du khách mới,  
> **Tôi muốn** đăng ký tài khoản bằng email, mật khẩu và tên hiển thị,  
> **Để** tôi có thể lưu trữ lịch trình và tham gia nhóm du lịch.

- **Scenario 1: Đăng ký thành công với thông tin hợp lệ**
  - **Given** người dùng ở màn hình Đăng ký,
  - **When** nhập email chưa từng đăng ký `user@example.com`, mật khẩu `Pass1234@` (≥ 8 ký tự), tên hiển thị `Nguyễn Văn A`,
  - **Then** hệ thống tạo tài khoản mới với mật khẩu được băm BCrypt, trả về HTTP 201 cùng JWT token và chuyển hướng vào ứng dụng.
- **Scenario 2: Đăng ký thất bại khi email đã tồn tại**
  - **Given** email `registered@example.com` đã tồn tại trong cơ sở dữ liệu,
  - **When** người dùng cố gắng đăng ký với email này,
  - **Then** hệ thống từ chối với HTTP 400 và mã lỗi `EMAIL_ALREADY_EXISTS`, thông báo "Email này đã được sử dụng".

---

### US-AUTH-02: Đăng nhập tài khoản (FR-AUTH-02)
> **Là một** người dùng đã có tài khoản,  
> **Tôi muốn** đăng nhập bằng email và mật khẩu của mình,  
> **Để** truy cập dữ liệu chuyến đi cá nhân.

- **Scenario 1: Đăng nhập thành công**
  - **Given** tài khoản `user@example.com` đang ở trạng thái `ACTIVE`,
  - **When** người dùng nhập đúng email và mật khẩu,
  - **Then** hệ thống trả về HTTP 200 kèm Access Token (thời hạn 15 phút), Refresh Token (thời hạn 7 ngày) và thông tin cơ bản.
- **Scenario 2: Đăng nhập thất bại do sai mật khẩu**
  - **Given** tài khoản `user@example.com` tồn tại,
  - **When** người dùng nhập sai mật khẩu,
  - **Then** hệ thống trả về HTTP 401 với thông báo chung: "Email hoặc mật khẩu không chính xác" (không để lộ việc email có tồn tại hay không).

---

### US-AUTH-03: Làm mới phiên đăng nhập (Refresh Token - FR-AUTH-03)
- **Scenario 1: Tự động refresh khi Access Token hết hạn**
  - **Given** Access Token đã hết hạn nhưng Refresh Token trong SecureStore vẫn còn hạn và chưa bị thu hồi,
  - **When** mobile gửi yêu cầu `POST /api/v1/auth/refresh`,
  - **Then** hệ thống cấp cặp Access Token mới và xoay vòng Refresh Token (Token Rotation), người dùng tiếp tục thao tác mà không bị đăng xuất.

---

### US-AUTH-04: Cập nhật thông tin cá nhân (FR-AUTH-05)
- **Scenario 1: Cập nhật thông tin liên hệ khẩn cấp**
  - **Given** người dùng đã đăng nhập,
  - **When** người dùng nhập tên người thân `Trần Thị B`, số điện thoại `0912345678` vào mục liên hệ khẩn cấp và bấm Lưu,
  - **Then** hệ thống lưu thông tin vào trường `emergency_contact` dạng JSONB và trả về HTTP 200.

---

## 2. LUỒNG KHÁM PHÁ ĐIỂM ĐẾN (DESTINATION DISCOVERY - BF-01)

### US-DEST-01: Tìm kiếm điểm đến (FR-DEST-02)
> **Là một** khách du lịch,  
> **Tôi muốn** tìm kiếm điểm đến bằng từ khóa tiếng Việt có dấu hoặc không dấu,  
> **Để** tôi dễ dàng tìm thấy địa danh mình cần ngay cả khi gõ nhanh.

- **Scenario 1: Tìm kiếm không phân biệt dấu**
  - **Given** cơ sở dữ liệu có địa điểm `Bà Nà Hills`,
  - **When** người dùng nhập từ khóa `ba na`,
  - **Then** hệ thống trả về danh sách có chứa `Bà Nà Hills` trong thời gian phản hồi ≤ 2.0 giây.
- **Scenario 2: Không tìm thấy kết quả phù hợp**
  - **Given** người dùng nhập từ khóa `dia diem khong ton tai 123`,
  - **When** hệ thống tìm kiếm trong database,
  - **Then** trả về HTTP 200 với mảng rỗng `[]`, mobile hiển thị trạng thái Empty State kèm nút "Xóa bộ lọc".

---

### US-DEST-02: Lọc điểm đến theo tiêu chí (FR-DEST-03)
- **Scenario 1: Kết hợp lọc theo tỉnh thành và khoảng giá**
  - **Given** người dùng chọn tỉnh `Đà Nẵng` và chọn mức giá `Miễn phí` (`price_max = 0`),
  - **When** bấm Áp dụng bộ lọc,
  - **Then** danh sách chỉ hiển thị các địa điểm như `Cầu Rồng`, `Bán đảo Sơn Trà`, `Bãi biển Mỹ Khê` với `price_max = 0` và thuộc Đà Nẵng.

---

### US-DEST-03: Xem chi tiết điểm đến (FR-DEST-04)
- **Scenario 1: Hiển thị đầy đủ thông tin địa điểm**
  - **Given** người dùng chọn xem `Đại Nội Huế`,
  - **When** màn hình chi tiết tải xong,
  - **Then** hiển thị đầy đủ: Tên, ảnh, mô tả, giá vé (`200.000 VNĐ`), giờ mở cửa các ngày, tọa độ bản đồ và đường dẫn nguồn thông tin (`hueworldheritage.org.vn`).
- **Scenario 2: Xử lý địa điểm chưa có giá vé / giờ mở cửa**
  - **Given** địa điểm có trường `price_min` và `price_max` là `NULL`,
  - **When** người dùng xem chi tiết,
  - **Then** hệ thống hiển thị nhãn "Chưa có thông tin giá vé", tuyệt đối không tự ý hiển thị số 0 hoặc thông tin sai lệch.

---

### US-DEST-04: Lưu điểm đến yêu thích (FR-DEST-05)
- **Scenario 1: Đánh dấu yêu thích**
  - **Given** người dùng đã đăng nhập và đang xem điểm đến `Chùa Cầu Hội An`,
  - **When** bấm vào biểu tượng Trái tim,
  - **Then** hệ thống gọi `PUT /api/v1/destinations/{id}/favorite`, trái tim chuyển sang màu đỏ và địa điểm xuất hiện trong tab `Favorites`.
- **Scenario 2: Khách vãng lai (Guest) bấm yêu thích**
  - **Given** người dùng chưa đăng nhập,
  - **When** bấm biểu tượng Trái tim,
  - **Then** ứng dụng hiển thị thông báo yêu cầu đăng nhập và chuyển hướng sang màn hình Login.
