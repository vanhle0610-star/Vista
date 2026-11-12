# VISTA — nghiệm thu Bản đồ & GPS

Ngày: 30/10/2026. Phạm vi: trang web `/map` và endpoint chỉ đường hiện có.

## Kiến trúc và lỗi đã sửa

- Renderer hiện tại: MapLibre GL JS; nền đường phố OpenFreeMap. Giữ API địa điểm VISTA và provider chính ORS; OSRM vốn có được giữ làm dự phòng riêng cho ô tô qua endpoint cùng origin `POST /api/v1/map/routes` của web.
- Backend trước đây chỉ nhận xuất phát/đích, bỏ qua `waypoints` do frontend gửi. Nay gửi một mảng tọa độ đầy đủ, đúng thứ tự, trong một request ORS; kiểm tra đủ segment và cộng số liệu các chặng.
- Frontend trước đây tự chuyển sang OSRM công khai rồi vẽ đường nội suy và ước tính thời gian nếu cả hai API lỗi. Đã bỏ nội suy. Nhánh OSRM thật được khôi phục ở server web sau khi phát hiện backend chưa chạy và thiếu ORS key; giữ hình học/chặng/số liệu dịch vụ trả về, không sinh tuyến giả. Đi bộ chỉ dùng ORS, không nhận nhầm tuyến ô tô.
- Các ô trước đây dùng index làm React key, dữ liệu là chuỗi ID địa điểm; xóa/đổi thứ tự còn gọi nhầm callback đặt lại toàn bộ danh sách. Nay mỗi ô có ID riêng ổn định; tên, tọa độ được tra bằng ID địa điểm của đúng ô. Xóa tuyến không xóa các điểm đã chọn.
- Loại bỏ tối ưu thứ tự bằng khoảng cách chim bay. Tuyến giữ thứ tự người dùng chọn, bao gồm khi kéo thả hoặc dùng nút/bàn phím để sắp xếp.
- Sửa thao tác bấm lại ô đang focus để mở gợi ý. Dropdown dùng portal ngoài sidebar, điều chỉnh theo visual viewport; nút nhỏ có CSS riêng để tránh `min-height`/padding toàn cục làm lệch hàng.
- Thay badge chữ bằng vòng tròn/ghim đỏ theo vai trò hiện tại, đường chấm giữa các icon. Marker có vùng bấm 44px, popup tên/vai trò và không dịch tọa độ. Chấm xanh/vòng sai số là đối tượng GPS riêng.
- GPS dùng chung hook một lần lấy vị trí; gộp yêu cầu đang chạy, tái sử dụng fix tối đa 30 giây, loại fix cũ, dọn callback/listener/timer. Không mở watch song song hay biểu thị đang theo dõi. Xem vị trí chỉ đổi camera; chọn GPS làm xuất phát mới cập nhật tọa độ xuất phát. Tuyến đang xem giữ snapshot xuất phát; lần tính tiếp theo sẽ lấy lại GPS nếu snapshot hết hạn.
- Bật `instructions` trong request ORS để bảo đảm lấy segment phục vụ tổng số liệu. Tham khảo [tài liệu phản hồi ORS](https://giscience.github.io/openrouteservice/v9.10.0/api-reference/endpoints/directions/requests-and-return-types) và [issue của ORS về segment khi tắt instructions](https://github.com/GIScience/openrouteservice/issues/2223).

## File sửa/tạo trong đợt này

| Nhóm | File |
| --- | --- |
| Trang hiện tại | `web/src/app/map/page.tsx`, `web/src/app/map/map-page.module.css` |
| Renderer | `web/src/features/map-location/StreetMapView.tsx`, `StreetMapView.module.css` |
| Nhập lộ trình | `web/src/features/map-location/components/DirectionsPanel.tsx`, `DirectionsPanel.module.css` |
| GPS | `web/src/features/map-location/hooks/useGeolocation.ts` |
| Mô hình/chỉ đường | `web/src/features/map-location/routing/stops.ts` (mới), `routing/routes.ts`, `coordinates.ts`, `types.ts` |
| Sửa kết nối chỉ đường | `web/src/app/api/v1/map/routes/route.ts` (mới), `web/src/features/map-location/routing/server.ts` (mới) |
| Backend | `backend/src/main/java/com/vista/map/api/RoutingController.java`, `backend/src/main/java/com/vista/map/application/RoutingService.java` |
| Hợp đồng API | `contracts/openapi/tv5-routing.json`, sinh lại `web/src/types/api.generated.ts` và `mobile/src/types/api.generated.ts` |
| Kiểm thử | `backend/src/test/java/com/vista/map/RoutingControllerTest.java`, `web/scripts/test-map-gps.mjs`, `web/scripts/test-route-planner.mjs` (mới), `web/scripts/verify-route-planner.mjs` (mới), `web/package.json` |
| Kiểm thử kết nối và tuyến thật | `web/scripts/test-routing-server.mjs`, `web/scripts/verify-live-routing.mjs` (mới) |

Các file đã có thay đổi trước đợt này được giữ lại; danh sách trên chỉ nêu phạm vi đã can thiệp cho yêu cầu này.

## Kết quả kiểm tra

| Trường hợp | Kết quả / loại bằng chứng |
| --- | --- |
| Hai điểm: vòng tròn → ghim đỏ | Qua kiểm thử trình duyệt trên trang thật/MapLibre |
| Ba điểm và thêm đích mới | Qua; đích cũ thành điểm dừng, focus ô đích mới |
| Đổi thứ tự bằng nút, Alt + mũi tên | Qua; giữ ID ô và cập nhật thứ tự request/marker |
| Xóa điểm dừng, sửa lựa chọn | Qua; không đặt lại xuất phát/đích, không bỏ qua ô trống |
| Không còn badge A/B/C | Qua kiểm tra mã và DOM marker của lộ trình |
| Thêm điểm dừng từ thẻ | Qua; chèn trước đích đang có |
| Giới hạn điểm | Qua; tối đa 6 điểm (giới hạn VISTA), frontend/backend/contract cùng kiểm tra |
| GPS đã cấp quyền | Qua với tọa độ do browser test context cung cấp; marker xanh, giữ nguyên tuyến và xuất phát thủ công |
| Chọn GPS làm xuất phát | Qua; request dùng đúng tọa độ được cung cấp, các điểm khác giữ nguyên |
| Chưa quyết định quyền | Qua kiểm tra gọi API nền tảng từ thao tác rõ ràng; chưa xác minh hộp thoại quyền trên thiết bị thật |
| Từ chối / timeout / không có vị trí | Qua; lỗi rõ, không tạo marker vị trí giả. Timeout/unavailable dùng callback kiểm thử |
| HTTP không bảo mật / thiếu Geolocation | Qua unit test hook; không gọi thiết bị |
| Fix cũ / request trùng / callback sau unmount hoặc thu hồi quyền | Qua unit test hook |
| Nhiều chặng, tổng thời gian/khoảng cách | Qua 8 test backend với HTTP server giả lập upstream; gồm tuyến quay lại xuất phát, sai tọa độ, thiếu segment, quota, timeout |
| Hình học từ API / response cũ | Qua unit test: giữ nguyên path, từ chối thiếu chặng, bỏ response cũ đến muộn và response sau khi xóa/sửa |
| Vòng sai số | Qua unit test: các điểm trên vòng cách tâm đúng bán kính mét; dùng polygon GeoJSON của MapLibre |
| Desktop / 390px / 360px | Qua kiểm thử browser, không tràn ngang; GPS/zoom ngoài bottom sheet, dropdown bấm được |

`npm run build` thành công. `npm test` web thành công: GPS, mô hình lộ trình, request/response và 12 test auth có sẵn. ESLint các file TypeScript/JavaScript sửa trong đợt này đạt. API contract validate đạt (3 cảnh báo có sẵn). Backend routing test và Spotless kiểm tra riêng các file Java liên quan.

Lệnh tái chạy kiểm thử browser (PowerShell, web chạy cổng 3100):

```powershell
$env:VISTA_TEST_STYLE_FIXTURE='1'
node web/scripts/verify-route-planner.mjs
```

Kết quả chi tiết, request kiểm thử và ảnh ở `artifacts/vista-route-planner/results.json`, `desktop.png`, `responsive-390.png`, `responsive-360.png`, `dropdown-390.png`, `dropdown-360.png`.

## Giới hạn xác minh

- Bộ browser có 14 kiểm tra đạt, không có lỗi JavaScript. Nó chạy component thật và renderer MapLibre thật, nhưng dùng API địa điểm/chỉ đường kiểm thử, nền bản đồ trống có kiểm soát và tọa độ do browser cung cấp. Các tuyến vuông góc trong ảnh là hình học fixture phục vụ kiểm thử, không phải tuyến thực tế của sản phẩm.
- Lần chạy ban đầu dùng nền trực tuyến không tải được bản đồ; môi trường có lỗi `ERR_NETWORK_ACCESS_DENIED`. Sau khi khởi động web với quyền kết nối mạng, đã xác minh bản đồ OpenFreeMap và tuyến OSRM thật, không mock API/chỉ đường/bản đồ. ORS trực tuyến và GPS trên thiết bị thật vẫn chưa xác minh; không xác nhận giao thông trực tiếp và không chạy giả lập mobile.
- API địa điểm hiện có chỉ trả tỉnh và danh mục, chưa có địa chỉ đường/số nhà. Gợi ý hiển thị đúng các dữ liệu phụ hiện có; không tự dựng địa chỉ. Giới hạn 6 điểm là giới hạn sản phẩm/backend VISTA, không phải tuyên bố về quota tài khoản ORS.
- Chưa xác minh bàn phím ảo thực trên iOS/Android. Dropdown đã xử lý `visualViewport` và kiểm tra responsive bằng trình duyệt desktop.
- Lint toàn thư mục bản đồ ban đầu còn lỗi có sẵn ở `DestinationList.tsx` và `data/publicDestinations.ts`; không mở rộng thay đổi sang các file đó. Next build có cảnh báo nhiều lockfile và middleware convention cũ, không làm build thất bại.

## Sửa lỗi kết nối sau nghiệm thu giao diện

Nguyên nhân xác nhận tại máy: `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`, backend cổng 8080 không chạy, chưa cấu hình `ORS_API_KEY`. Browser gọi trực tiếp cổng backend nên báo lỗi mạng chung; việc bỏ nhánh OSRM trong lần chỉnh giao diện cũng đã làm mất dự phòng ô tô vốn có.

Đã chuyển request browser sang API cùng origin của web. Server ưu tiên backend ORS, sử dụng OSRM cho ô tô khi backend/ORS không khả dụng. Không vượt lỗi input/quyền/429, không thay no-route bằng tuyến khác, kiểm tra đủ chặng và dữ liệu hình học. Giữ chế độ đi bộ dùng ORS; lỗi thiếu dịch vụ đi bộ nêu rõ cấu hình cần thiết. Tham khảo [OSRM Route Service](https://project-osrm.org/docs/v5.24.0/api/#route-service) cho thứ tự tọa độ, hình học GeoJSON và đơn vị số liệu.

Kiểm tra trực tuyến bằng `node web/scripts/verify-live-routing.mjs`: **đạt**, bản đồ tải thành công, không mock địa điểm/bản đồ/chỉ đường. GPS được cung cấp một fix kiểm thử, không phải thiết bị thật:

- Xuất phát kiểm thử → Cầu Rồng: 1 chặng, 110 điểm hình học, 2.942 m, 204.800 ms.
- Xuất phát kiểm thử → Cầu Rồng → Chợ Hàn: 2 chặng, 168 điểm hình học, 5.436,4 m, 378.100 ms. Tổng bằng tổng các chặng từ OSRM.
- Bằng chứng và ảnh: `artifacts/vista-route-planner/live-routing/results.json`, `desktop.png`, `responsive.png`.
- `npm test`, build web và ESLint các file sửa trong đợt sửa kết nối đều đạt. Unit test mới kiểm tra ORS hoạt động, backend dừng, OSRM lỗi, giới hạn điểm, dữ liệu thiếu/sai và không dùng tuyến ô tô cho đi bộ.
