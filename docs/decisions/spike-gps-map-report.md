# Kiểm chứng Map & Location TV5

Báo cáo cập nhật 24/10/2026; thay thế báo cáo spike cũ thiếu minh chứng. Không sử dụng các con số pin/độ trễ hay nhãn PASS Android/iOS trong báo cáo cũ để kết luận nghiệm thu.

Quyết định hiện hành: [D3 foreground location](D3-foreground-location.md), [D4 MapLibre/OpenFreeMap/openrouteservice](D4-maplibre-openfreemap-ors.md). Luồng sản phẩm không còn Google Maps, Leaflet, mô hình cầu hoặc giả lập hai thiết bị. Mock polling chỉ còn phục vụ test tự động.

Tài liệu sử dụng: [MapViewAdapter](../api/map-view-adapter.md), [cấu hình khóa và Storage](../deployment/tv5-keys-and-storage.md). Kết quả chi tiết phải đối chiếu artifact và báo cáo bàn giao hiện tại, không lấy ảnh thử nghiệm cũ làm ảnh bản mới.

Trạng thái cần giữ đúng: điện thoại thật và spike hai thiết bị chưa kiểm chứng. Chưa có ORS/Storage key nên chưa kiểm chứng chỉ đường/upload với dịch vụ thật. Kiểm thử dùng browser/native API mock phải ghi riêng với việc tải nền OpenFreeMap thật, API VISTA thật và Android emulator.
