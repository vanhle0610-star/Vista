# Bình luận và lượt thích cộng đồng

Bảng tin web dùng bài viết từ API. Các bài mẫu từng có form bình luận chỉ hiện toast và nút thích chỉ giữ trạng thái trong React đã được bỏ khỏi bảng tin. Những tương tác mẫu trước đây không có bản ghi trên máy chủ để khôi phục.

Để có ba bài mẫu Đà Nẵng, Hội An và Hà Giang với bình luận/lượt thích thật, chạy `npm.cmd run seed:community` tại thư mục gốc. Lệnh đọc `backend/.env`, thêm ba tác giả demo không thể đăng nhập và ba bài công khai vào database đang cấu hình. UUID cố định và `ON CONFLICT DO NOTHING` cho phép chạy lại mà không tạo trùng hoặc xóa lượt thích/bình luận đã test. Dữ liệu không tự thêm khi ứng dụng khởi động.

Lượt thích mới được lưu trong `post_likes`, khóa chính `(post_id, user_id)`. Cần khởi động lại backend để Flyway chạy migration `V202611111100__community_post_likes.sql` trước khi dùng giao diện mới. Migration chỉ thêm bảng và chỉ mục.

| API | Kết quả |
| --- | --- |
| `GET /api/v1/posts/{postId}/like` | Trạng thái thích của tài khoản đang đăng nhập và tổng lượt thích |
| `PUT /api/v1/posts/{postId}/like` | Thích bài; gửi lại không tạo lượt thích trùng |
| `DELETE /api/v1/posts/{postId}/like` | Bỏ thích của chính tài khoản; gửi lại vẫn an toàn |

Cả ba API cần JWT; danh tính lấy từ phiên xác thực. Bài bị ẩn hoặc xóa trả `404`. Phản hồi có dạng `{ "postId": "uuid", "liked": true, "likeCount": 1 }`. Lượt thích được tải lại khi mở bảng tin hoặc đổi tài khoản, không dùng localStorage để giả lập việc lưu.

Bình luận tiếp tục dùng `GET/POST /api/v1/posts/{postId}/comments`. Web hiển thị ngay bình luận do API trả về sau khi lưu thành công, chặn gửi trùng khi đang chờ phản hồi, giữ nội dung khi gửi thất bại và hiện lỗi có thể thử lại. Danh sách có nút tải các trang tiếp theo.

Kiểm tra trình duyệt bằng `node web/scripts/verify-community-interactions.mjs` khi web đang chạy ở cổng 3000; có thể đổi bằng `TV5_WEB_URL`. Script dùng API mô phỏng trong browser context riêng, không ghi database chung. Bao gồm tải lại trang, đăng xuất/đổi tài khoản, bỏ thích, bình luận mới, phân trang, lỗi API và gửi trùng. Bằng chứng nằm trong `web/node_modules/.cache/community-interactions/`.

Kiểm thử Java: `CommunityInteractionsControllerTest` kiểm tra API và xác thực; `CommunityLikeVisibilityTest` kiểm tra ranh giới bài bị ẩn/xóa; `CommunityInteractionsPersistenceTest` chạy migration và dịch vụ với PostgreSQL dùng một lần khi có Docker, được bỏ qua nếu máy thiếu Docker.
