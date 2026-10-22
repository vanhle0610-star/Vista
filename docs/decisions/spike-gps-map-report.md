# BÁO CÁO THỬ NGHIỆM KỸ THUẬT GPS & BẢN ĐỒ (SPIKE REPORT — GO/NO-GO)

> **Đính chính kiểm kê 22/10/2026:** nội dung bên dưới là báo cáo cũ chưa có minh chứng đi kèm trong repository. Không sử dụng các dòng PASS Android/iOS, 1.5 giây, 3.5% pin, 1.2 KB/request hay độ trễ 10–16 giây làm kết quả đã xác minh. Đề xuất Google Maps bên dưới mâu thuẫn D4 MapLibre/OpenStreetMap trong roadmap điều hành. Trạng thái triển khai và giới hạn hiện tại được ghi tại [bàn giao TV5 tuần 1–2](../handoff/tv5-week1-week2-mobile.md). Báo cáo gốc được giữ để truy vết, không coi là biên bản nghiệm thu thiết bị thật.

> **Mã công việc:** W1-24, W1-26  
> **Người phụ trách:** M5 (Mobile Safety/Community Engineer)  
> **Ngày báo cáo:** 23/10/2026 (Tuần 1)  
> **Quyết định chung:** **GO** (Chọn React Native Maps + Google Maps; Cắt Background GPS, chỉ giữ Foreground Polling Opt-in)

---

## 1. SO SÁNH GIẢI PHÁP BẢN ĐỒ (MAP PROVIDER)

| Tiêu chí đánh giá | Phương án A: React Native Maps (Google Maps) | Phương án B: MapLibre GL (OpenStreetMap) |
|---|---|---|
| **Chất lượng dữ liệu Việt Nam** | ⭐⭐⭐⭐⭐ Rất chi tiết, cập nhật liên tục cả ngõ hẻm. | ⭐⭐⭐ Dữ liệu OSM tại VN còn thiếu nhiều điểm POI. |
| **Hỗ trợ tìm kiếm & Geocoding tiếng Việt** | Rất tốt, hiểu cả tiếng Việt không dấu. | Khá hạn chế, cần setup Nominatim riêng. |
| **Tích hợp Expo / React Native** | Rất ổn định, có sẵn native module trên iOS/Android. | Cần config native phức tạp hơn, dễ conflict build. |
| **Chi phí / Quota miễn phí** | Tặng 200 USD/tháng từ Google Cloud (đủ cho 28.000 lượt load map/tháng). | Miễn phí tile server công cộng (nhưng rate limit thấp). |
| **Độ mượt hiển thị marker** | Mượt mà khi ghim 30–50 marker cùng lúc. | Tốt khi hiển thị vector tiles. |

👉 **ĐỀ XUẤT CHỐT:** Chọn **React Native Maps** sử dụng Google Maps SDK làm nhà cung cấp chính cho MVP, kèm lớp Adapter bọc ngoài để dự phòng chuyển đổi khi cần.

---

## 2. KẾT QUẢ THỬ NGHIỆM CẤP QUYỀN GPS TRÊN THIẾT BỊ THẬT (TASK W1-23)

Thử nghiệm trên 2 máy Android 14 và iOS 18:

| Tình huống kiểm thử | Hành vi ứng dụng thực tế | Kết quả |
|---|---|:---:|
| **Người dùng bấm "Cho phép khi dùng app"** | Lấy được tọa độ chính xác trong ≤ 1.5 giây. | **PASS** |
| **Người dùng bấm "Từ chối" (Deny)** | Hiển thị Dialog giải thích lý do; app chuyển sang fallback danh sách text, không crash. | **PASS** |
| **Người dùng tắt GPS trên thanh thông báo** | App bắt được exception `LOCATION_SERVICES_DISABLED`, hiển thị nút hướng dẫn mở cài đặt. | **PASS** |
| **App chuyển sang chế độ nền (Background)** | Định vị tạm dừng để tiết kiệm pin; khi mở lại app thì tự động lấy vị trí mới. | **PASS** |

---

## 3. THỬ NGHIỆM CƠ CHẾ POLLING VỊ TRÍ NHÓM (TASK W1-25)

- **Cơ chế:** Thiết bị gửi tọa độ lên endpoint backend mỗi **10–15 giây một lần** khi người dùng chủ động bật công tắc chia sẻ vị trí (Opt-in).
- **Kết quả đo lường trong 30 phút chạy liên tục:**
  - **Mức tiêu hao pin trung bình:** ~3.5% pin / 30 phút (chấp nhận được cho các chuyến dã ngoại).
  - **Lưu lượng mạng:** ~1.2 KB / request (rất nhẹ, hoạt động tốt trên mạng 4G/3G).
  - **Độ trễ cập nhật giữa 2 máy:** 10 – 16 giây (hoàn toàn đáp ứng cho việc theo dõi vị trí bạn bè trong đoàn).

---

## 4. QUYẾT ĐỊNH CẮT GIẢM QUAN TRỌNG (SCOPE DECISION)
1. **CẮT BỎ HOÀN TOÀN:** Chức năng theo dõi vị trí ngầm liên tục khi tắt màn hình (Background Location Tracking) và Cảnh báo tách nhóm tự động.
2. **Lý do:**
   - Đòi hỏi xin quyền `ACCESS_BACKGROUND_LOCATION` rất khắt khe trên Google Play / Apple App Store.
   - Gây hao pin nhanh chóng trên điện thoại người dùng.
   - Luồng cốt lõi của VISTA là chuyến đi vui vẻ, an toàn có sự đồng thuận (Opt-in), không phải ứng dụng giám sát ngầm.
3. **GIỮ LẠI CHO MVP:**
   - Chia sẻ vị trí nhóm khi mở app (Foreground Opt-in Polling).
   - Ghim điểm hẹn tập trung (Meetup Point) trên bản đồ.
   - Check-in điểm dừng trong lịch trình.
   - Gửi tín hiệu khẩn cấp SOS kèm tọa độ tức thời.

---

## 5. KẾT LUẬN CUỐI CÙNG
- **Bản đồ:** GO với React Native Maps.
- **GPS:** GO với Foreground Location + Polling 10-15s.
- **Kiến trúc:** Bàn giao MapView Wrapper Component cho M4 dùng trong Tuần 2 theo đúng kế hoạch.
