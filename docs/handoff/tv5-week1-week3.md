# Bàn giao TV5 tuần 1–3

Cập nhật: 25/10/2026. Phạm vi tuần 1–3 theo yêu cầu hiện tại. Giữ các thay đổi chưa commit có sẵn, rà soát và sửa tiếp trên implementation hiện hữu. Không dùng APK cũ hoặc ảnh giả lập cũ làm bằng chứng cho bản mới. Không commit, push, deploy hoặc tạo dịch vụ trả phí.

## Phần đã triển khai

| Nhiệm vụ | Đầu ra và giới hạn |
|---|---|
| Tuần 1 — D3/D4 | Có quyết định foreground cá nhân và MapLibre/OpenFreeMap/openrouteservice; spike điện thoại thật/hai thiết bị chưa kiểm chứng |
| Tuần 1 — DDL/API | Giữ baseline, migration TV5 và stub PostVisibilityService. Tái sử dụng tên bảng vật lý `comments`, `checkins`; không tạo bản sao `post_comments`, `check_ins` |
| Tuần 2 — MapViewAdapter | Renderer web và native riêng, API truyền dữ liệu từ ngoài; giữ alias native cho consumer cũ; có hướng dẫn cho TV1/TV3/TV4 |
| Tuần 2 — dữ liệu | Giữ bộ 10 địa điểm/10 ảnh có nguồn và giấy phép; audit hash 10/10 ảnh đạt. Có 6 điểm đã xác minh tọa độ, 4 điểm để trống đúng mẫu TV1 và chưa sẵn sàng làm marker |
| Tuần 2 — GPS | Giải thích lần đầu, chỉ xin quyền khi bấm; nhớ lựa chọn, kiểm tra quyền khi trở lại; lấy vị trí foreground, bỏ callback cũ và có tắt tự định vị |
| W3-TV5-01 | Nút xem bản đồ/chỉ đường từ chi tiết web/mobile, chọn đúng ID; origin GPS hoặc điểm VISTA thủ công. Thông tin đã xem có cache bộ nhớ phiên trên web; lỗi bản đồ/tuyến tách khỏi thông tin địa điểm |
| W3-TV5-02 | CRUD posts/comments thật, JWT/ownership/optimistic version, phân trang ổn định, idempotency gửi bài; adapter Storage private và dọn ảnh bỏ dở. Upload với dịch vụ thật chưa kiểm chứng vì thiếu khóa |
| W3-TV5-03 | Feed/tạo/sửa/xóa bài và bình luận trên web và tab mobile chung; chọn/xem trước/bỏ ảnh, giữ nháp khi lỗi, chống bấm gửi lặp. Bundle Android đã xuất; điện thoại thật chưa kiểm chứng |

Chỉ đường tích hợp là phần làm sớm theo yêu cầu bổ sung và thuộc luồng W3-TV5-01; không ghi thành tiêu chí gốc tuần 2. Không triển khai check-in, chia sẻ vị trí nhóm, meetup, SOS, moderation UI đầy đủ, AI hoặc điều hướng giọng nói.

## Kiến trúc và các file chính

- Web Next.js 16/React: `web/src/app/map`, `web/src/features/map-location/StreetMapView.tsx`, adapter wrapper, hooks GPS/routing và layer dữ liệu public. Dùng Navbar chuẩn hiện có. `/community` và `/destination/[id]` dùng layout chung. Route dev cũ chuyển về `/map`.
- Mobile Expo SDK 57/React Native 0.86: `mobile/src/features/map`, `mobile/src/features/community/CommunityScreen.tsx`, route tab cộng đồng và điểm tích hợp trong `destination/[id]`. Tái sử dụng theme, AppButton/AppText, SecureStore và API client/JWT của nhóm.
- Backend Spring Boot hiện có: `com.vista.map` cho ORS, `com.vista.community` cho bài viết/bình luận/Storage; đọc tác giả qua UserService và địa điểm qua DestinationQueryService. Không truy cập repository nội bộ module khác.
- File dùng chung chỉnh có mục đích: SecurityConfiguration cho GET cộng đồng/public route, GlobalExceptionHandler cho file quá lớn, OpenAPI và generated types, menu Navbar, điểm tích hợp chi tiết mobile, package/lockfile và `.env.example`. Header trên màn nhỏ dùng menu hiện có cho đăng nhập/tạo chuyến đi để tránh tràn ngang. Mẫu backend dùng cổng 8080 cho khớp mẫu web/mobile. Không thay thuật toán auth/JWT hoặc theme dùng chung.
- Contract: `tv5-routing.json`, `tv5-week3.json` được root `openapi.yaml` tham chiếu. Safety endpoint trong `tv5-week1.yaml` vẫn là thiết kế.
- Migration `V202611100900__tv5_community_week3.sql`: bổ sung cột cộng đồng còn thiếu, request id/hash và bảng upload ledger. Giữ nguyên byte các migration cũ đã áp dụng. Không bật out-of-order hoặc xóa DB. Migration này đã từng được áp dụng vào DB local dùng chung và được giữ lại để khớp lịch sử.

## Phần cũ được thay

Đã tra nơi dùng, sao lưu và gỡ loader Google Maps, Three.js/bridge layer, Leaflet CDN, fixture trong renderer, bảng log/mô phỏng/so sánh và UI mock hai máy. Gỡ dependency web `@googlemaps/js-api-loader`, `@types/google.maps`, `three`, `@types/three`; giữ Google đăng nhập của nhóm. Mock polling chuyển vào test-support, không export vào navigation. Xem [kiểm kê đầy đủ](../decisions/map-legacy-inventory.md).

Nền hiện dùng OpenFreeMap Liberty với pitch/bearing ban đầu bằng 0 và attribution của style. Không có vệ tinh vì chưa chọn nguồn ảnh hợp pháp phù hợp miễn phí; không tạo nút giả. Không cam kết nhãn/độ phủ giống Google Maps.

## Cấu hình và cách chạy

1. Giữ `backend/.env` hiện có, bổ sung cấu hình theo [hướng dẫn khóa/Storage](../deployment/tv5-keys-and-storage.md). Mã Supabase đọc từ cấu hình DB là `cyqvqehhjpvwovdzscxm`; nhóm cần xác nhận quyền dashboard. Không tạo dự án Supabase hoặc auth riêng.
2. Root: `npm.cmd run dev:backend -- -PuseCurrentJvm` với JDK hiện có tương thích Java 21. Script Node đọc `backend/.env`; Gradle chạy trực tiếp không tự đọc file đó. Lần kiểm tra backend dùng JDK tại `D:\file app data\Java` và `GRADLE_USER_HOME=D:\Du_An_OJT\Vista\backend\.gradle-local` vì cache hệ thống ban đầu bị lỗi transform. Cache local này được git-ignore; nhóm có thể dùng cache Gradle bình thường trên máy khác.
3. Web: `npm.cmd run dev --prefix web`, hoặc `npm.cmd run build --prefix web` rồi `npm.cmd run start --prefix web`. Cấu hình API local hiện là `http://localhost:8080/api/v1`.
4. Mobile: `cd mobile; npx.cmd expo start --dev-client` khi nhóm cần chạy trên development build tương thích. MapLibre native không chạy trong Expo Go. Không cần chạy Android để xem web. Backend Android emulator dùng `10.0.2.2`, điện thoại thật dùng IP LAN.

Lệnh web chuẩn dùng cổng 3000. Lần kiểm tra này chạy production server tại cổng 3002, kèm CORS runtime cho localhost:3002 (không đổi cấu hình CORS đã lưu): [bản đồ đang kiểm tra](http://localhost:3002/map), [cộng đồng](http://localhost:3002/community). Trang chi tiết: `/destination/<id-API-thật>`, mở tuyến: `/map?destinationId=<id>&directions=1`.

## Quyền và dữ liệu

Xem công khai không cần đăng nhập; mọi thao tác ghi lấy tác giả từ JWT backend. Tài khoản khác không được sửa/xóa bài/bình luận. Danh sách chỉ trả VISIBLE, chưa xóa; bình luận kiểm tra parent. Chỉnh sửa dùng version trong JSON. Chính sách bảng tin cơ bản tuần 3 tạo bài VISIBLE; PostVisibilityService cho TV1 giữ khả năng ẩn/khôi phục đúng trạng thái trước đó và không khôi phục bài tác giả đã xóa.

Ảnh giới hạn JPEG/PNG thực, tối đa 4 ảnh/bài, trần 5 MiB/ảnh, 25 triệu điểm ảnh. Bucket private; client không biết service key/object path tùy ý. Upload reserve trước khi gửi Storage, chỉ chủ ảnh được claim một lần; ảnh bỏ dở hết hạn và có cleanup retry. Gửi lại bài sau lỗi dùng cùng clientRequestId/payload hash; không báo thành công khi backend chưa xác nhận.

GPS chỉ lưu ý muốn bật/tắt, không lưu tọa độ vào localStorage/SecureStore. Web dùng one-shot và Permissions API khi có; native subscription dừng sau fix/timeout/lỗi và khi mất focus/background. Khi tính tuyến, tọa độ gửi qua backend đến ORS; không tự gửi cho nhóm. Giữ thông tin địa điểm đã tải không đồng nghĩa hỗ trợ offline toàn bộ.

## Kết quả kiểm tra

- Contract validate/generate đạt; còn 3 cảnh báo có sẵn ở health/auth và server localhost.
- Chạy lại bộ kiểm thử backend và build thành công: 257 ca, 251 đạt, 6 bỏ qua do không có Docker (5 ca Tv5SchemaTest và 1 PostgresMigrationTest); không có failure/error. Chi tiết `artifacts/tv5-week3/backend-tests-current.json`. Spotless riêng module Map/Community đạt; Spotless toàn backend còn lỗi định dạng có sẵn ở 71 file, không format lại module người khác.
- Web type-check, scoped lint và production build đạt. Global web lint còn 9 lỗi ở các module có sẵn ngoài phần Map/Community; chi tiết `artifacts/tv5-week3/web-lint-all.json`, không tự sửa các nghiệp vụ đó.
- Web browser đã qua 12 kiểm tra với nền OpenFreeMap thật và API VISTA thật: mở đúng địa điểm, thiếu ORS key không vẽ giả, guest đọc feed, upload thiếu cấu hình giữ nháp, bài chỉ có chữ lưu/tải lại/sửa được, bình luận lưu được, không có uncaught page error. Kết quả `artifacts/tv5-week3/web-verification.json`.
- Thêm 5 kiểm tra trình duyệt đạt trong `map-browser-current.json`: cả hai module worker được phục vụ đúng, trang tham chiếu/map thật, đồng bộ card/marker, lựa chọn “Để sau” khi Chromium từ chối quyền, và fallback 390px giữ thông tin/không tràn ngang. Hai báo cáo trình duyệt đều ghi `status=passed` cho lần chạy cuối.
- API thật đã qua 36 kiểm tra bằng hai tài khoản QA: phân quyền, tác giả server, CRUD, stale version, retry đồng thời không trùng bài, MIME/size, parent visibility và validation/chưa cấu hình định tuyến. Kết quả `artifacts/tv5-week3/api-verification.json`. Script dùng lại tài khoản QA; token/mật khẩu chỉ ở cache bị git-ignore. Backend xác nhận schema đã ở phiên bản 202611100900; không áp dụng migration mới trong lần kiểm tra này.
- Các test HTTP ORS/Storage dùng server loopback giả lập để kiểm tra protocol, profile, thứ tự tọa độ, timeout/quota và key không bị lộ. Không tính là kiểm chứng dịch vụ ORS/Storage thật.
- 29 ca kiểm thử TV5 mobile đạt (8 suites), gồm camera/GPS, response tuyến trả về muộn, lựa chọn “Để sau” khi quyền hệ thống bị chặn, dữ liệu từng trang khi mất mạng và việc giữ nháp/ảnh sau lỗi gửi hoặc upload. Kết quả trong `artifacts/tv5-week3/mobile-tv5-tests-current.json` (API được mock, không phải bằng chứng thiết bị thật). Scoped lint Map/Community và type-check mobile đạt. Nút “Vị trí của tôi” chỉ đưa camera tới fix được yêu cầu một lần; fix tự động sau đó chỉ cập nhật marker, không kéo camera khi người dùng đang xem nơi khác.
- `expo export --platform android` thành công (1670 modules, Hermes bundle khoảng 4,4 MB); Expo prebuild Android từ app.json thành công. Đây là xác minh đóng gói mã native, không thay thế cài/chạy app hoặc kiểm thử phần cứng.
- Manifest Android sau merge có ACCESS_COARSE_LOCATION/ACCESS_FINE_LOCATION và không có ACCESS_BACKGROUND_LOCATION hoặc FOREGROUND_SERVICE_LOCATION; bằng chứng `artifacts/tv5-week3/android-permissions-current.json`. Đây là kiểm tra cấu hình build, không phải kiểm tra quyền trên điện thoại thật.
- Full mobile Jest hiện có 1 ca lỗi ngoài TV5 ở `TripsHubScreen.test.tsx` (trùng chữ “Đang diễn ra”), 45 ca đạt ở lần chạy toàn bộ trước khi bổ sung regression test. Full mobile lint có 15 lỗi ngoài TV5 ở auth/itinerary/trips; không ghi là toàn repository đạt lint.
- Audit dữ liệu chạy lại: 10/10 ảnh tồn tại và khớp SHA256/nguồn/giấy phép, `artifacts/tv5-week3/data-integrity-current.json`. Với ảnh Public domain, quyền sử dụng được ghi ở trang nguồn; không yêu cầu license URL giống CC. Nguồn địa điểm/giấy phép giữ ngày kiểm tra gốc, không gán ngày audit file thành ngày kiểm tra lại nguồn ngoài.

## Ảnh và kiểm tra giao diện web

- [Bản đồ thật và card địa điểm](../../artifacts/tv5-week3/web-map-current.png).
- [Bản đồ lỗi ở chiều rộng 390px: còn thông tin và nút thử lại](../../artifacts/tv5-week3/web-map-fallback-current.png).
- [Chỉ đường: trạng thái thiếu cấu hình dịch vụ](../../artifacts/tv5-week3/web-route.png).
- [Cộng đồng sử dụng API thật](../../artifacts/tv5-week3/web-community.png).

`map-browser-current.json` kiểm tra worker và shared module, trang chủ/đăng nhập/map, card ↔ marker, lựa chọn GPS và fallback không tràn ngang. Khi chọn marker, danh sách chỉ cuộn vùng danh sách, không kéo toàn trang khỏi bản đồ. Viewport 390px là trình duyệt web, không phải ảnh Android/iOS.

Map web/mobile tải từng trang 20 điểm để tránh request 100 điểm vượt timeout khi API chậm; giới hạn tổng vẫn 10.000 mục. Hiển thị dần các trang đã nhận và giữ chúng khi trang tiếp theo lỗi, kèm trạng thái đang tải/thử lại. Không thay dữ liệu thật bằng fixture.

## Phụ thuộc chưa xác minh

Nhóm xác nhận chưa có khóa ORS hoặc quyền Storage. Vì vậy **chưa kiểm chứng tuyến ORS thật, quota tài khoản và đăng bài kèm ảnh thật**. Nhóm cần được cấp quyền đúng dự án, điền cấu hình, restart backend và kiểm tra các luồng đó. Điện thoại thật, iOS và spike hai thiết bị cũng chưa kiểm chứng; không dùng mock hoặc artifact APK cũ để đánh dấu đạt.

Tài liệu: [D3](../decisions/D3-foreground-location.md), [D4](../decisions/D4-maplibre-openfreemap-ors.md), [cách dùng adapter](../api/map-view-adapter.md), [khóa/Storage từng bước](../deployment/tv5-keys-and-storage.md), [10 địa điểm TV5](../../database/seed/destinations/tv5-week2-candidates.md).

## Quy trình xác minh trên điện thoại thật

ADB hiện không liệt kê thiết bị và `emulator -list-avds` không có AVD; chưa có ảnh chụp native mới. Không lấy ảnh web ở viewport nhỏ làm bằng chứng mobile native.

| Ca kiểm tra | Trạng thái thiết bị thật |
|---|---|
| Android/iOS: mở tab Bản đồ, style sáng, nhãn tiếng Việt, marker từ API | Chưa thực hiện |
| Lần đầu: Để sau, Cho phép định vị; lần sau: tự lấy khi còn quyền | Chưa thực hiện |
| Thu hồi quyền, vị trí gần đúng, tắt dịch vụ vị trí, mở cài đặt | Chưa thực hiện |
| Chuyển nền/đổi tab/quay lại: dừng subscription và bỏ callback cũ | Chưa thực hiện |
| Mở từ chi tiết chọn đúng marker; điểm không có tọa độ vẫn đọc thông tin | Chưa thực hiện |
| Tính tuyến thật, no-route, timeout/quota với tài khoản ORS đã cấu hình | Chờ khóa ORS và thiết bị |
| Feed khách; đăng nhập, chọn/bỏ ảnh, đăng bài, tải lại, sửa/xóa, bình luận | Chờ Storage và thiết bị |
| Tài khoản thứ hai bị từ chối sửa/xóa qua API | Đạt API thật; chưa thực hiện trên điện thoại |

Chạy `npx.cmd expo run:android` hoặc development build theo `mobile/eas.json`; sau đó `npx.cmd expo start --dev-client`. Điền API URL bằng IP LAN và cho phép origin phù hợp nếu kiểm tra bằng web. Ghi model máy, OS, build, ngày kiểm tra và ảnh cho từng ca; không đánh dấu đạt trước khi thực hiện.

Có thể dùng `npm.cmd run build:android:tv5` sau prebuild. Runner gọi Java wrapper bằng danh sách tham số để tránh PowerShell tách tên `-P`/`-D` chứa dấu chấm, dùng project cache riêng và giữ đường dẫn output/codegen/CMake chuẩn của SDK. ARM64 là mặc định; emulator x86_64 dùng `npm.cmd run build:android:tv5 -- x86_64`. Dùng JDK 17 theo [hướng dẫn Android của Expo](https://docs.expo.dev/workflow/android-studio-emulator/); runner dừng sớm với JDK ngoài dải 17–21 để tránh lặp lại lỗi CMake của Worklets đã gặp với Java 25. Thiết lập `JAVA_HOME` và Android SDK như build chuẩn; `GRADLE_USER_HOME` có thể trỏ tới cache riêng. Đây là helper build local, không thay SDK hoặc cơ chế render.
