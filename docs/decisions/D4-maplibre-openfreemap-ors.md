# D4 — MapLibre, OpenFreeMap và openrouteservice

Ngày: 24/10/2026. Thay thế quyết định thử Google Maps/Leaflet/cầu 3D cũ trong module TV5.

Web Next.js 16 dùng MapLibre GL JS 6 ở client component. Mobile chung của nhóm dùng Expo SDK 57, React Native 0.86 và MapLibre React Native 11.5. SDK native v11 yêu cầu New Architecture, React Native từ 0.80 và development/native build; không hỗ trợ Expo Go. Không dùng WebView hoặc DOM để thay renderer native.

Nguồn nền: `https://tiles.openfreemap.org/styles/liberty`, được công bố trong [OpenFreeMap Quick Start](https://openfreemap.org/quick_start/). Dùng nền đường phố sáng, góc nhìn đầu pitch=0/bearing=0; giữ attribution OpenFreeMap/OpenMapTiles/OpenStreetMap và các URL attribution của style. Không dùng ảnh tĩnh thay bản đồ, tải offline hàng loạt, địa hình nghiêng hoặc model cầu. Font của style và font VISTA hỗ trợ chữ có dấu; nhãn/độ phủ dữ liệu không được cam kết giống Google Maps.

MapViewAdapter nhận dữ liệu từ caller; renderer không fetch địa điểm hoặc import fixture. TV1 tiếp tục sở hữu GET `/destinations` và `/destinations/{id}`. Layer dữ liệu phân trang toàn bộ danh sách công khai, bỏ qua tọa độ không hợp lệ và dùng placeholder khi ảnh là Storage key chưa phân giải được. Không bịa ảnh/giá/giờ mở cửa.

Backend Spring Boot hiện có nhận POST `/api/v1/map/routes`, kiểm tra tọa độ và mode rồi gọi `https://api.openrouteservice.org/v2/directions/{profile}/geojson`. Hỗ trợ `DRIVING → driving-car`, `WALKING → foot-walking`. Khóa chỉ ở backend. GeoJSON được chuẩn hóa thành `{path,distanceMeters,durationMillis,warnings,attribution}`. Không tuyên bố xe máy hoặc giao thông realtime. Có timeout, giới hạn local và xử lý quota/key/no-route; không tạo đường thẳng giả khi thất bại.

Chỉ đường tích hợp là phần làm sớm theo yêu cầu bổ sung và thuộc W3-TV5-01 khi mở từ chi tiết; **không phải tiêu chí gốc của tuần 2**. Thiếu ORS key trả lỗi rõ; chưa xác nhận quota tài khoản hoặc tuyến thật. Hướng dẫn: [khóa ORS và Storage](../deployment/tv5-keys-and-storage.md).

Không triển khai tùy chọn vệ tinh: OpenFreeMap không được mặc định có ảnh vệ tinh và chưa chọn được nguồn phù hợp có điều khoản rõ ràng trong phạm vi miễn phí. Không có nút giả.

Tham khảo đã kiểm tra: [MapLibre native requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [ORS Directions](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types). Các khóa/giới hạn trong tài khoản thực tế phải do nhóm xác minh; không suy ra từ số quota cũ trên mạng.
