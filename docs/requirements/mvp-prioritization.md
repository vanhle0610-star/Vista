# BẢNG ƯU TIÊN PHẠM VI MVP RÚT GỌN (VISTA 8 TUẦN)

> **Mã công việc:** W1-01  
> **Người phụ trách:** M1 (BA / PM / QA)  
> **Phiên bản:** 1.1 (Biên bản thống nhất toàn đội sau họp Kickoff)

---

## 1. NGUYÊN TẮC CẮT GIẢM ĐỂ BẢO VỆ TIẾN ĐỘ

Để đảm bảo nhóm 5 thành viên hoàn thành và bàn giao một sản phẩm chạy thực tế trên máy thật trong vòng 8 tuần (2 tháng), nhóm đã thống nhất áp dụng mô hình **MoSCoW rút gọn**:
- Tuyệt đối bảo vệ các luồng nghiệp vụ cốt lõi (**Must Have**).
- Cắt bỏ triệt để các tính năng phức tạp, tốn thời gian nghiên cứu nhưng không nằm trên đường găng demo chính.

---

## 2. DANH MỤC PHÂN LOẠI TÍNH NĂNG (MOSCOW)

### 2.1. MUST HAVE (Bắt buộc phải có để bàn giao)

| Mã | Chức năng nghiệp vụ | Luồng | Mô tả rút gọn |
|---|---|---|---|
| **FR-AUTH-01→04** | Xác thực & Phân quyền | Chung | Đăng ký, đăng nhập email/mật khẩu, JWT token rotation, vai trò `USER`, `MODERATOR`, `ADMIN`. |
| **FR-DEST-01→05** | Khám phá điểm đến | BF-01 | Tìm kiếm không dấu tiếng Việt, lọc theo tỉnh/loại hình/khoảng giá, xem chi tiết điểm đến, lưu yêu thích. |
| **FR-DEST-06** | Bản đồ điểm đến | BF-01 | Xem vị trí trên bản đồ và mở ứng dụng chỉ đường ngoại vi (Google Maps / Apple Maps). |
| **FR-PLAN-01→02** | Tạo chuyến đi & Lịch trình | BF-02/03 | Tạo chuyến đi, quản lý lịch trình theo ngày, thêm/xóa/sắp xếp điểm dừng thủ công. |
| **FR-PLAN-03** | AI Trip Planner (Bản cốt lõi) | BF-02 | Gợi ý lịch trình mẫu từ danh sách địa điểm đã xác minh theo số ngày và sở thích. |
| **FR-GRP-01→04** | Quản lý nhóm & Lời mời | BF-03 | Tạo link mời có hạn dùng (token hash), gia nhập nhóm, phân quyền `OWNER` / `MEMBER`. |
| **FR-GRP-05** | Biểu quyết địa điểm | BF-03 | Đề xuất địa điểm vào chuyến đi và các thành viên vote Up/Down để chốt lịch trình. |
| **FR-EXP-01→03** | Ngân sách & Chia tiền | BF-04 | Ghi nhận khoản chi tiêu nhóm, chia đều hoặc chia theo phần, theo dõi ai nợ ai. |
| **FR-SAFE-01→03** | Vị trí nhóm chủ động (Opt-in) | BF-05 | Chia sẻ vị trí khi đang mở ứng dụng (foreground polling 10–15s), điểm hẹn tập trung (Meetup). |

---

### 2.2. SHOULD HAVE (Làm nếu còn thời gian đệm ở Tuần 6–7)

| Mã | Chức năng | Trạng thái điều chỉnh |
|---|---|---|
| **FR-COMM-01→03** | Bài viết & Đánh giá cộng đồng | Chỉ giữ đăng bài dạng text/ảnh đơn giản; đánh giá sao đơn giản (1–5 sao). |
| **FR-SAFE-08** | Cảnh báo khẩn cấp (SOS) | Tạm giữ ở mức gửi tọa độ và tin nhắn SOS lên server; phụ thuộc độ ổn định của Push Notification. |
| **FR-MOD-01** | Báo cáo nội dung vi phạm | Lưu báo cáo vào cơ sở dữ liệu để Moderator xử lý thủ công. |

---

### 2.3. COULD HAVE / CUT OUT (Cắt bỏ khỏi phạm vi MVP)

Nhóm đã chính thức **cắt bỏ hoàn toàn** các hạng mục sau khỏi đợt phát hành MVP:

1. ❌ **AI phân loại spam tự động (FR-MOD-02):** Chuyển sang hàng đợi duyệt bài thủ công của Moderator.
2. ❌ **Cảnh báo tách nhóm ngầm (FR-SAFE-07):** Tính năng đòi hỏi chạy background GPS liên tục, gây hao pin nặng và phức tạp trên iOS/Android native.
3. ❌ **Dashboard KPI & Thống kê doanh thu quản trị phức tạp:** Giao diện Admin chỉ tập trung quản lý danh mục địa điểm, tài khoản và duyệt báo cáo.
4. ❌ **Hệ thống đặt phòng khách sạn, vé máy bay & cổng thanh toán trực tuyến:** Không thuộc phạm vi ứng dụng đã được phê duyệt.
5. ❌ **Gợi ý tự động tìm địa điểm thay thế khi trời mưa:** Đưa vào backlog giai đoạn 2.

---

## 3. TIÊU CHÍ HOÀN THÀNH (DEFINITION OF DONE - W1-01)
- [x] Tài liệu phân loại phạm vi được M1 biên soạn đầy đủ.
- [x] Cả nhóm 5 thành viên thống nhất danh sách tính năng Must giữ lại đến cùng.
- [x] Lưu trữ công khai tại `docs/requirements/mvp-prioritization.md`.
