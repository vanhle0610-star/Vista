# Ảnh và kết quả kiểm tra hai popup VISTA

- [Popup địa điểm trên web](web-places.png)
- [Popup cảm xúc trên web](web-feelings.png)
- [Web viewport nhỏ: địa điểm](web-small-places.png)
- [Web viewport nhỏ: cảm xúc](web-small-feelings.png)

Ảnh địa điểm dùng dữ liệu API TV1 thật qua HTTP controller/service + PostgreSQL. Tài khoản và feed phía sau popup được cô lập bằng fixture, không ghi bài vào DB dùng chung. Các ảnh viewport nhỏ là web responsive, không phải ứng dụng mobile. Popup cảm xúc dùng 8 mã/emoji có sẵn của sản phẩm.

Kết quả: web-verification.json (33 browser checks với HTTP fixtures/GPS mô phỏng), backend-verification.json (55 pass / 5 Docker skip), live-api-verification.json (TV1 suggestions/search/page2 pass; feed thật 500 do migration cũ chưa áp dụng).

**Không chạy kiểm thử/build mobile theo yêu cầu người dùng.**

Đọc docs/handoffs/TV5_LOCATION_FEELING_POPUPS_HANDOFF.md để biết file sửa, API/nearest limits, trạng thái chờ xác nhận migration trên DB chung và checklist mobile.
