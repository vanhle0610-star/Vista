# HƯỚNG DẪN DỮ LIỆU ĐỊA ĐIỂM DU LỊCH (DESTINATION SEED DATA)

> **Mã công việc:** W1-TV1-03 & W1-TV1-04  
> **Người quản lý:** TV1 (Destination Discovery Lead)  
> **Thư mục:** `database/seed/destinations/`  
> **Định dạng:** CSV UTF-8 (chuẩn hóa RFC 4180)

---

## 1. CÁC TẬP TIN TRONG THƯ MỤC

| Tên file | Mục đích | Số lượng bản ghi | Trạng thái |
|---|---|:---:|:---:|
| `sample.schema.csv` | File mẫu mô tả tiêu đề cột (header) và 1 dòng dữ liệu giả định chuẩn | 1 mẫu | Đã chốt cấu trúc |
| `demo_destinations_seed.csv` | Bộ dữ liệu mục tiêu 30 địa điểm có nguồn kiểm chứng của 3 địa phương | 30 địa điểm | Đã kiểm chứng (15/10/2026) |

---

## 2. QUY CÁCH TIÊU ĐỀ CỘT (CSV HEADERS)

File CSV bắt buộc phải có đúng thứ tự 12 cột sau:

```csv
name,province,category,latitude,longitude,price_min,price_max,opening_hours,source_url,verified_at,description,image_reference
```

### Chi tiết các trường dữ liệu:

1. **`name` (Bắt buộc):** Tên hiển thị đầy đủ của điểm đến (ví dụ: `"Bà Nà Hills"`, `"Đại Nội Huế (Hoàng Thành Huế)"`).
2. **`province` (Bắt buộc):** Tên tỉnh thành trực thuộc, phải khớp với tên trong bảng `provinces` (`"Đà Nẵng"`, `"Thừa Thiên Huế"`, `"Quảng Nam"`).
3. **`category` (Bắt buộc):** Danh mục trải nghiệm chính, khớp với `destination_categories` (`"Di tích & Lịch sử"`, `"Biển & Thiên nhiên"`, `"Cảnh quan & Văn hóa"`, `"Ẩm thực & Mua sắm"`,...).
4. **`latitude` (Tùy chọn):** Vĩ độ thập phân WGS84, định dạng `numeric(9,6)` (ví dụ: `16.061100`).
5. **`longitude` (Tùy chọn):** Kinh độ thập phân WGS84, định dạng `numeric(9,6)` (ví dụ: `108.227200`).
6. **`price_min` (Tùy chọn):** Giá vé vào cổng thấp nhất tính bằng đồng Việt Nam (`0` = miễn phí, số dương = có phí, để trống/`NULL` = chưa rõ thông tin).
7. **`price_max` (Tùy chọn):** Giá vé cao nhất (vé trọn gói / cáp treo). Bắt buộc `price_max >= price_min`.
8. **`opening_hours` (Tùy chọn):** Chuỗi JSON escape chuẩn đại diện 7 ngày trong tuần.
   - Ví dụ: `"{""mon"":""07:00-17:30"",""tue"":""07:00-17:30"",...}"`
   - Điểm mở cả ngày: `"00:00-23:59"`
   - Ngày nghỉ: `"closed"`
9. **`source_url` (Bắt buộc):** Đường link URL chính thức của ban quản lý di tích, cổng thông tin du lịch chính thống hoặc website doanh nghiệp điều hành. Tuyệt đối không bịa link.
10. **`verified_at` (Bắt buộc nếu đã kiểm chứng):** Thời điểm kiểm chứng định dạng ISO 8601 UTC: `2026-10-15T00:00:00Z`.
11. **`description` (Tùy chọn):** Đoạn văn bản giới thiệu ngắn gọn, súc tích (1–2 câu) làm nổi bật giá trị cốt lõi của địa danh.
12. **`image_reference` (Tùy chọn):** Đường dẫn quy ước ảnh tương đối trong hệ thống lưu trữ (ví dụ: `"destinations/danang/cau-rong.jpg"`).

---

## 3. DANH SÁCH 30 ĐỊA ĐIỂM ĐÃ XÁC MINH TRONG TUẦN 1

### 3.1. Địa phương 1: TP. Đà Nẵng (10 địa điểm)
1. Cầu Rồng Đà Nẵng (Miễn phí, 24/7, nguồn: `danangfantasticity.com/cau-rong`)
2. Bà Nà Hills (900.000 - 1.250.000 VNĐ, 07:00-22:00, nguồn: `banahills.sunworld.vn`)
3. Bán đảo Sơn Trà & Chùa Linh Ứng (Miễn phí, 06:00-18:00, nguồn: `danangfantasticity.com/chua-linh-ung`)
4. Bãi biển Mỹ Khê (Miễn phí, 24/7, nguồn: `danangfantasticity.com/bai-bien-my-khe`)
5. Danh thắng Ngũ Hành Sơn (40.000 - 100.000 VNĐ, 07:00-17:30, nguồn: `nguhanhson.org.vn`)
6. Bảo tàng Điêu khắc Chăm (60.000 VNĐ, 07:30-17:00, nguồn: `chammuseum.vn`)
7. Chợ Hàn Đà Nẵng (Miễn phí, 06:00-19:00, nguồn: `danangfantasticity.com/cho-han`)
8. Cầu Tình Yêu & Tượng Cá Chép Hóa Rồng (Miễn phí, 24/7, nguồn: `danangfantasticity.com/cau-tinh-yeu`)
9. Suối khoáng nóng Núi Thần Tài (450.000 - 650.000 VNĐ, 08:30-17:30, nguồn: `nuithantai.com`)
10. Đèo Hải Vân (Miễn phí, 24/7, nguồn: `danangfantasticity.com/deo-hai-van`)

### 3.2. Địa phương 2: Thừa Thiên Huế (10 địa điểm)
11. Đại Nội Huế (Hoàng Thành Huế) (200.000 VNĐ, 07:00-17:30, nguồn: `hueworldheritage.org.vn`)
12. Chùa Thiên Mụ (Miễn phí, 07:00-18:00, nguồn: `khamphahue.com.vn/chua-thien-mu`)
13. Lăng Khải Định (150.000 VNĐ, 07:00-17:30, nguồn: `hueworldheritage.org.vn`)
14. Lăng Tự Đức (150.000 VNĐ, 07:00-17:30, nguồn: `hueworldheritage.org.vn`)
15. Lăng Minh Mạng (150.000 VNĐ, 07:00-17:30, nguồn: `hueworldheritage.org.vn`)
16. Chợ Đông Ba (Miễn phí, 06:00-18:00, nguồn: `khamphahue.com.vn/cho-dong-ba`)
17. Cầu Trường Tiền & Sông Hương (Miễn phí, 24/7, nguồn: `khamphahue.com.vn/cau-truong-tien`)
18. Đồi Vọng Cảnh (Miễn phí, 06:00-18:30, nguồn: `khamphahue.com.vn/doi-vong-canh`)
19. Làng Hương Thủy Xuân (Miễn phí, 07:00-18:00, nguồn: `khamphahue.com.vn/lang-huong-thuy-xuan`)
20. Trường Quốc Học Huế (Miễn phí, 07:00-17:00, nguồn: `khamphahue.com.vn/quoc-hoc-hue`)

### 3.3. Địa phương 3: Quảng Nam — Đô thị cổ Hội An (10 địa điểm)
21. Chùa Cầu Hội An (120.000 VNĐ vé tham quan phố cổ, 07:00-21:30, nguồn: `hoianworldheritage.org.vn`)
22. Phố cổ Hội An & Sông Hoài (120.000 VNĐ, 24/7, nguồn: `hoianworldheritage.org.vn`)
23. Nhà cổ Tấn Ký (Trong vé phố cổ, 08:30-17:45, nguồn: `hoianworldheritage.org.vn`)
24. Hội quán Phúc Kiến (Trong vé phố cổ, 07:00-18:00, nguồn: `hoianworldheritage.org.vn`)
25. Rừng dừa Bảy Mẫu Cẩm Thanh (150.000 - 300.000 VNĐ vé thuyền thúng, 07:00-17:00, nguồn: `hoianworldheritage.org.vn`)
26. Làng gốm Thanh Hà (35.000 VNĐ, 08:00-17:30, nguồn: `thanhhapottery.com`)
27. Làng rau Trà Quế (35.000 VNĐ, 07:00-18:00, nguồn: `hoianworldheritage.org.vn`)
28. Bãi biển An Bàng (Miễn phí, 24/7, nguồn: `hoianworldheritage.org.vn`)
29. Chợ đêm Hội An (Miễn phí, 17:00-23:00, nguồn: `hoianworldheritage.org.vn`)
30. Đảo Cù Lao Chàm (150.000 - 650.000 VNĐ cano & bảo tồn, 07:00-16:00, nguồn: `hoianworldheritage.org.vn`)

---

## 4. NGUYÊN TẮC NHẬP LIỆU (IDEMPOTENT IMPORT)

1. File CSV được xử lý trong transaction đơn nhất.
2. Nếu địa điểm đã tồn tại (khớp theo `slug`), cập nhật thông tin (`UPDATE`), không tạo mới trùng lặp `UUID`.
3. Tự động sinh `slug` từ tên địa điểm nếu thiếu: `slug = slugify(unaccent(name))`.
4. Không xóa hoặc làm vô hiệu hóa các bản ghi ngoài danh sách CSV.
