# TV5 — hợp đồng API đề xuất tuần 1

Trạng thái: **DRAFT, chưa triển khai endpoint**. Nguồn máy đọc là
`contracts/openapi/tv5-week1.yaml`, được tham chiếu từ `contracts/openapi/openapi.yaml`.
Repository chưa có `docs/api`; tài liệu này bổ sung phần giải thích, không thay thế OpenAPI.
Base URL `/api/v1`; UUID, JSON camelCase, timestamp RFC 3339 có múi giờ; lưu DB timestamptz.

| API dự kiến | Quyền và dữ liệu |
|---|---|
| GET `/map/destinations` | Guest; bounding box bắt buộc, chỉ PUBLISHED có tọa độ; kiểm tra min ≤ max, chưa hỗ trợ bbox qua kinh tuyến 180 |
| GET `/posts`, `/posts/{postId}` | Guest; chỉ VISIBLE, deleted_at IS NULL |
| POST `/posts` | Đăng nhập; body, destinationId tùy chọn, metadata media; tác giả lấy từ principal, mặc định PENDING theo baseline |
| PATCH, DELETE `/posts/{postId}` | Chính tác giả; If-Match chứa version, so sánh và tăng version trong transaction; DELETE đặt deleted_at |
| GET, POST `/posts/{postId}/comments` | GET công khai trên bài đang hiển thị; POST cần đăng nhập; bình luận VISIBLE, chưa xóa |
| PATCH, DELETE `/posts/{postId}/comments/{commentId}` | Chính tác giả; xác minh comment thuộc post; DELETE đặt deleted_at; không sửa/xóa qua bài bị ẩn/xóa |
| GET, POST `/trips/{tripId}/check-ins` | OWNER hoặc MEMBER hợp lệ; tọa độ bắt buộc; thời điểm do server cấp; itineraryItemId tùy chọn |
| GET, POST `/trips/{tripId}/meetup-points` | OWNER hoặc MEMBER hợp lệ; label, tọa độ, description/targetTime tùy chọn |
| PATCH, DELETE `/trips/{tripId}/meetup-points/{meetupId}` | Thành viên hợp lệ và chính người tạo; chưa cấp quyền sửa hộ cho owner |
| GET `/trips/{tripId}/location-shares` | OWNER hoặc MEMBER hợp lệ; chỉ vị trí chưa dừng, chưa hết hạn, có tọa độ, của người vẫn còn quyền trong chuyến đi |
| PUT `/trips/{tripId}/location-shares/me` | Thành viên; consent=true và expiresAt tương lai bắt buộc; tạo/bắt đầu lại phiên của chính mình |
| PATCH `/trips/{tripId}/location-shares/me` | Thành viên; cập nhật tọa độ mới nhất, sessionStartedAt phải khớp; không kéo dài expiresAt |
| DELETE `/trips/{tripId}/location-shares/me` | Thành viên; dừng idempotent, xóa tọa độ và timestamp vị trí trong cùng transaction |

Danh sách dùng `page` từ 0, `size` 1–100, mặc định 20; trả `{items,page,size,total}`.
Feed/check-in sắp xếp thời gian giảm dần rồi id; bình luận tăng dần rồi id;
map theo id, điểm hẹn theo targetTime NULLS LAST rồi id, chia sẻ theo userId.
Danh sách vị trí chỉ phân trang dữ liệu đã lọc hết hạn/quyền, kể cả khi tính total.
POST trả 201 (bài mới PENDING chưa đồng nghĩa công khai), đọc/sửa trả 200, DELETE trả 204.
Body/label phải có ký tự sau trim; schema minLength không thay thế kiểm tra whitespace.
PATCH bài là thay thế body bắt buộc, destination/media bỏ qua thì giữ nguyên; mảng media rỗng xóa liên kết.
Không cho tác giả đổi status/deletedAt/version trực tiếp. PATCH meetup cần label và tọa độ đầy đủ;
description/targetTime bỏ qua giữ nguyên, null để xóa. Mọi resource con phải thuộc trip/post trên URL.

Lỗi dùng `application/problem+json` theo GlobalExceptionHandler: type, title, status,
detail, instance, code, requestId. Đề xuất 400 VALIDATION_ERROR (tọa độ/thời hạn/consent/body),
401 UNAUTHORIZED, 403 FORBIDDEN (ngoài nhóm/không phải tác giả), 404 NOT_FOUND (không có
hoặc bài bị ẩn/xóa đối với public), 409 VERSION_CONFLICT / LOCATION_SESSION_CONFLICT.
Đây là mã cần thống nhất với TV2, chưa thêm handler dùng chung.

Mọi API trip gọi `TripAccessService.requireMember(tripId, currentUserId)` **trước** đọc/ghi;
không nhận userId hay createdBy từ client. FK không thay thế membership. Kiểm tra lại quyền khi
đọc vị trí và cập nhật, không chỉ ở lúc bật chia sẻ. Khi rời nhóm phải chấm dứt phiên qua
hợp đồng sự kiện/callback TV2–TV3 cần thống nhất; trong lúc chờ, đọc phải loại người chia sẻ
không còn quyền qua public TripAccessService. Không truy vấn repository/entity của module khác.

PUT chỉ bật sau đồng thuận mới; đang có phiên còn hiệu lực trả 409 để tránh vô tình gia hạn.
Sau hết hạn/dừng, PUT tái sử dụng row UNIQUE(trip_id,user_id), thay started_at bằng thời điểm
server, xóa stopped_at, cấp lại expires_at và tọa độ trong transaction. Dùng khóa row/upsert
an toàn và kiểm tra số row thay đổi. PATCH dùng điều kiện enabled, stopped_at IS NULL,
expires_at > statement_timestamp(), started_at khớp sessionStartedAt; server cấp last_updated_at.
Không cho bản tin GPS cũ khởi động lại phiên. Mẫu SQL bàn giao nằm trong tài liệu TV2.
Đọc vị trí không cache dùng chung; đề xuất Cache-Control: no-store. MVP chỉ cập nhật khi app mở,
không lưu lịch sử GPS và không theo dõi nền. Thời hạn tối đa, chu kỳ cleanup và SLA xóa chờ nhóm chốt.

Map không tự đọc bảng destination của TV1. `DestinationQueryService.findPublishedById(UUID)`
đã tồn tại cho tra cứu đơn lẻ; **chưa có** public interface tìm theo bbox/phân trang:
cần TV1 bổ sung query trả DTO id, name, latitude, longitude của điểm PUBLISHED.
`itineraryItemId` của check-in phải thuộc đúng trip: cần public interface TV3 xác thực;
không tự gọi itinerary repository. Liên kết này chưa được FK đơn lẻ bảo đảm cùng chuyến đi.

API báo cáo cần đăng nhập nhưng do **TV1** sở hữu, cùng content_reports,
moderation_events và admin. TV5 chỉ cung cấp PostVisibilityService; không định nghĩa lại API đó.
Mobile không giữ service-role key. Backend kiểm tra quyền nghiệp vụ, không chỉ dựa vào RLS.
Tuần 1 không thay SecurityConfiguration để mở route public; TV2 review matcher khi triển khai thật.
