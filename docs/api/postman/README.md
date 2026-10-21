# HƯỚNG DẪN KIỂM THỬ POSTMAN COLLECTION (W2-TV1)

> **Mô-đun:** Khám phá Điểm đến Du lịch (Destination Discovery — BF-01)  
> **Thành viên phụ trách:** TV1 (Guest / Visitor — Destination Lead)  
> **Tuần thực hiện:** Tuần 2 (W2: 26/10 – 30/10/2026)  

---

## 1. Giới thiệu

File collection `VISTA_Destination_Discovery_W2.postman_collection.json` cung cấp bộ 7 kịch bản kiểm thử tự động cho toàn bộ các endpoint công khai thuộc mô-đun Destination của TV1 theo hợp đồng chuẩn OpenAPI 3.1.

### Danh sách 7 kịch bản kiểm thử:
1. **Lấy danh sách điểm đến công khai (Mặc định):** Kiểm tra HTTP 200, cấu trúc phân trang `{items, page, size, total}` và xác nhận 100% bản ghi có `status = 'PUBLISHED'`. Tự động lưu `id` đầu tiên vào biến `sampleDestinationId`.
2. **Tìm kiếm theo từ khóa tiếng Việt (keyword):** Kiểm tra tìm kiếm theo tên hoặc mô tả (ví dụ: `keyword=Bà Nà`).
3. **Lọc theo Tỉnh/Thành phố (province):** Kiểm tra lọc theo địa phương (ví dụ: `province=Đà Nẵng`).
4. **Lọc kết hợp Danh mục & Mức giá tối đa:** Kiểm tra lọc `category=Di tích` và `priceMax=100000`.
5. **Kiểm tra phân trang:** Kiểm tra tham số `page=0&size=5`.
6. **Xem chi tiết điểm đến hợp lệ:** Kiểm tra HTTP 200, đầy đủ thông tin: tên, ảnh, giá vé, giờ mở cửa 7 ngày và link xác minh.
7. **Xem chi tiết điểm đến không tồn tại (Kiểm tra lỗi 404):** Kiểm tra mã lỗi HTTP 404 và cấu trúc RFC 9457 Problem Details (`status: 404`, `code: "DESTINATION_NOT_FOUND"`).

---

## 2. Hướng dẫn chạy kiểm thử

### Bước 1: Khởi động Backend
Đảm bảo Backend đang chạy trên cổng `8080`:
```powershell
cd backend
.\run-backend.bat
```

### Bước 2: Import vào Postman
1. Mở ứng dụng **Postman**.
2. Nhấn nút **Import** ở góc trên bên trái.
3. Kéo thả file `docs/api/postman/VISTA_Destination_Discovery_W2.postman_collection.json` vào Postman.

### Bước 3: Cấu hình biến môi trường
Mặc định collection đã có sẵn biến:
- `baseUrl`: `http://localhost:8080/api/v1`

### Bước 4: Chạy toàn bộ Collection (Collection Runner)
1. Chuột phải vào collection **VISTA - Destination Discovery API (W2-TV1)** -> Chọn **Run collection**.
2. Nhấn **Run VISTA - Destination Discovery API (W2-TV1)**.
3. Quan sát kết quả: Tất cả 7 kịch bản đều đạt trạng thái **PASS (Xanh)**.
