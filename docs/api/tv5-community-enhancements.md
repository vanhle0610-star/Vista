# TV5 — phản hồi, cảm xúc, địa điểm và hồ sơ công khai

Ngày: 29/10/2026. Áp dụng cho backend Spring Boot, web Next.js và ứng dụng Expo hiện có. Giữ hệ thống `comments` và lượt thích hiện hữu; không tạo reaction/chat/follow/push mới.

## Schema và tương thích

Migration mới: `V202611111200__community_threads_feelings.sql`. Không sửa migration cũ. Bài cũ có `feeling = NULL`; bình luận cũ có `root_id = reply_to_id = NULL` và tiếp tục là bình luận gốc.

- `posts.feeling`: mã trong allowlist, có CHECK ở PostgreSQL và validation ở service.
- `comments.root_id`: bình luận gốc của luồng; `reply_to_id`: bình luận cụ thể đang được trả lời. Trả lời một phản hồi vẫn dùng cùng `root_id`.
- Khóa ngoại ghép với `post_id` chặn quan hệ chéo bài; API chỉ cho chọn một bình luận đã tồn tại, cùng bài và còn hiển thị. Không có API sửa quan hệ cha/con; không thể tạo chu trình qua API.
- `client_request_id` và SHA-256 `request_hash`: retry cùng tài khoản/mã/nội dung trả lại bản ghi đã lưu. Dùng lại mã cho nội dung khác trả `409`. Phản hồi bắt buộc có mã; bình luận gốc của client cũ có thể bỏ qua để giữ tương thích. Cả client web/mobile mới luôn gửi mã và giữ payload khi lỗi mạng/timeout chưa rõ kết quả.

## API

| API | Hành vi |
| --- | --- |
| `GET /posts` và `GET /posts/{id}` | Thêm `commentCount`, `feeling`, `destination`; author có `id`, `displayName`, `avatarUrl` |
| `POST /posts` | Nhận thêm `feeling` và `destinationId` đã công khai; vẫn giữ idempotency gửi bài/upload hiện hữu |
| `GET /posts/{id}/comments?page=0&size=10` | Phân trang bình luận gốc và placeholder cần giữ luồng |
| `GET /posts/{id}/comments/{rootId}/replies?page=0&size=10` | Phân trang phản hồi trong đúng luồng; không tải toàn bộ lúc mở feed |
| `POST /posts/{id}/comments` | `{body, replyToId?, clientRequestId?}`; tác giả luôn lấy từ JWT |
| `PATCH /posts/{id}/comments/{commentId}` | Giữ `{body, version}` và kiểm tra sở hữu/version tại server |
| `DELETE /posts/{id}/comments/{commentId}` | Xóa mềm của chính tác giả, trả `204`; không xóa nội dung người khác |

Comment trả thêm `rootId`, `replyToId`, `replyToAuthor` (hồ sơ công khai), `replyCount`, `deleted`. Page bình luận có `total` là số dòng trong loại danh sách đang phân trang (gốc hoặc phản hồi), `commentCount` là tổng nội dung hiển thị được của cả bài, độc lập số dòng client đã tải.

Tổng bình luận = bình luận gốc + phản hồi `VISIBLE`, chưa xóa, trong luồng còn được phép xem. Root bị ẩn không làm lộ phản hồi qua số đếm hoặc idempotent retry. Feed lấy số đếm bằng SQL aggregate/join trong truy vấn feed, không gọi thêm một truy vấn đếm cho từng bài. Web/mobile không tự tăng số đếm; sau mutation lấy snapshot mới từ API. Refresh đồng thời được gộp để tránh giữ snapshot cũ khi hai form gửi gần nhau.

## Quy tắc xóa luồng

Bình luận gốc bị xóa và còn phản hồi hợp lệ sẽ hiển thị **“Bình luận đã bị xóa”**, không trả nội dung cũ trong API. Các phản hồi của người khác vẫn đọc được và vẫn được tính; root đã xóa không được tính. Nếu không còn phản hồi hợp lệ thì placeholder biến mất khỏi danh sách. Không cho gửi thêm vào luồng có root đã xóa. Một phản hồi bị xóa không xóa các phản hồi khác trong luồng; quan hệ trả lời vẫn phục vụ ngữ cảnh tên người nhận.

## Cảm xúc của người viết

| Mã | Hiển thị |
| --- | --- |
| HAPPY | 😊 Vui vẻ |
| DELIGHTED | 😍 Thích thú |
| EXCITED | 🤩 Hào hứng |
| RELAXED | 😌 Thư giãn |
| GRATEFUL | 🥰 Biết ơn |
| CONFIDENT | 😎 Tự tin |
| SAD | 😢 Buồn |
| TIRED | 😴 Mệt mỏi |

Chọn/đổi/bỏ trước khi đăng. Mã là dữ liệu lưu trữ; nhãn/icon nằm ở client. Không nhận HTML tùy ý. Bài cũ không có cảm xúc hiển thị bình thường. Đây không phải hệ reaction vào bài hay bình luận.

## Địa điểm/GPS và phụ thuộc TV1

Dùng public `GET /destinations?keyword=...&page=...&size=100` hiện có; không dùng repository của TV1 hoặc dữ liệu giả. API chưa có truy vấn gần nhất đầy đủ. Client tải tối đa 5 trang × 100 địa điểm công khai phù hợp từ khóa, tính Haversine trong bộ nhớ, lọc 10 km và cho mở rộng rõ ràng 50/200 km. UI ghi rõ giới hạn tập dữ liệu này; không tuyên bố liệt kê mọi địa điểm xung quanh. Để có nearest search đầy đủ, cần TV1 bổ sung contract/API riêng trong tương lai.

Web tái sử dụng `useGeolocation`, mobile tái sử dụng `LocationController` với Expo Location cho một lần lấy vị trí foreground. Picker giải thích mục đích và có nút chủ động dùng vị trí. Đã cấp quyền thì không hỏi lại. Có trạng thái từ chối/chặn/GPS tắt/timeout/vị trí gần đúng/mất mạng/rỗng, tìm tên không cần GPS. Hủy request khi đóng/đổi truy vấn; bỏ callback cũ. Khoảng cách hiển thị là đường chim bay ước tính.

Tọa độ người dùng không được gửi trong request tìm kiếm, lưu vào bài, log hay lịch sử. Chỉ `destinationId` được xác nhận chọn mới gửi khi đăng. Không bật chia sẻ vị trí nhóm. Địa điểm gắn vào bài hiển thị theo phạm vi của bài. Backend xác nhận PUBLISHED và trả tên/khu vực/ảnh/coordinates công khai của chính địa điểm qua `DestinationQueryService` hiện hữu.

## Hồ sơ và cache

Community chiếu `UserService.getProfile` công khai thành record Author chỉ có ID, tên và avatar. Không trả email/điện thoại/bio/ngân hàng/roles trong feed/comments. Không sao chép tên/avatar vào bảng posts/comments. API đọc lại thông tin hiện tại khi refetch; tên dự phòng và avatar chữ cái khi thiếu ảnh/ảnh lỗi. Giữ chính sách hiện tại: hồ sơ vô hiệu hóa vẫn đọc được qua service; hồ sơ không còn tồn tại dùng tên dự phòng. Các tác giả demo không có quyền đăng nhập nhưng dữ liệu mẫu vẫn hiển thị.

Composer dùng own-profile API `/users/me`. Web refetch khi `vista-auth-change` hiện có hoặc focus cửa sổ; mobile khi focus màn hình, foreground và kéo làm mới. Luồng đang mở được refresh; không yêu cầu đăng nhập lại. Không sửa login hay trang profile của TV2. Không tạo liên kết hồ sơ công khai chưa tồn tại. Không truy cập repository của TV2.

## Chạy và kiểm chứng

Khởi động lại backend để Flyway áp dụng migration mới, sau đó tải lại web hoặc reload Metro/mobile:

```powershell
npm.cmd run dev:backend
npm.cmd run dev:web
npm.cmd run dev:mobile
```

Kiểm thử backend có Docker theo cấu hình dự án; nếu không có Docker, runner có chế độ opt-in PostgreSQL thực dùng schema riêng trong một transaction và rollback toàn bộ (kể cả tạo schema), không commit hoặc xóa dữ liệu chung:

```powershell
node scripts/test-community-backend.mjs --isolated-db
cd web
node scripts/verify-community-enhancements.mjs
```

Browser script dùng HTTP fixture trong Chrome context riêng; đó là bằng chứng UI, không giả làm kiểm thử end-to-end trên database sản phẩm. Lưu trữ/ownership/privacy/idempotency được kiểm chứng riêng bằng Java + PostgreSQL thực. Test native ở `mobile/src/features/community/__tests__/` và GPS controller/hook tests hiện hữu. Build Android được kiểm bằng Expo export/Hermes; không thay thế APK/iOS hoặc kiểm thử điện thoại thật.

Kết quả mới nhất, các cảnh báo/build lỗi có sẵn và ảnh: xem `docs/handoffs/TV5_COMMUNITY_ENHANCEMENTS_HANDOFF.md`. Tài liệu Expo 57 Location/Crypto và React Native Modal/KeyboardAvoidingView đã được đối chiếu; không thêm dependency hay dịch vụ trả phí.
