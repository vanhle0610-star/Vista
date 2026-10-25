# Cấu hình ORS và Storage cho TV5

Đã kiểm tra repository và tài liệu chính thức ngày 24/10/2026. Chưa có khóa ORS/Storage trong cấu hình local, nên **chỉ đường thật và upload ảnh thật chưa được kiểm chứng**. Không cần khóa để xem bản đồ OpenFreeMap, đọc địa điểm hoặc thử CRUD bài viết chỉ có chữ.

## 1. Backend đọc cấu hình thế nào?

`scripts/run-backend.mjs` đọc `backend/.env`, đưa từng biến vào environment của tiến trình Gradle/Spring Boot. Spring đọc `ORS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`, `COMMUNITY_STORAGE_BUCKET` qua cấu hình của module. Chạy Spring/Gradle trực tiếp không tự đọc `.env`: phải export biến hoặc cấu hình env-file trong IDE. Cần khởi động lại backend sau khi sửa `.env`.

Giữ file `backend/.env` hiện có; chỉ bổ sung các dòng còn thiếu. Không chép đè toàn bộ file bằng `.env.example` vì sẽ mất cấu hình database/JWT của nhóm.

```dotenv
ORS_API_KEY=
SUPABASE_URL=https://cyqvqehhjpvwovdzscxm.supabase.co
SUPABASE_SECRET_KEY=
# Nếu TV2 dùng khóa service_role cũ, điền dòng này thay cho SECRET_KEY:
SUPABASE_SERVICE_ROLE_KEY=
COMMUNITY_STORAGE_BUCKET=community
```

Các khóa chỉ nằm ở backend. Không điền vào `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, ảnh chụp, log hoặc chat. Giữ nguyên `GOOGLE_CLIENT_ID` nếu nhóm dùng Google **đăng nhập**; đó là cấu hình khác với Google Maps đã gỡ khỏi module.

## 2. Lấy ORS_API_KEY miễn phí

1. Mở [HeiGIT Account](https://account.heigit.org/) từ [trang đăng nhập openrouteservice](https://openrouteservice.org/log-in/).
2. Đăng nhập/đăng ký tài khoản được nhóm đồng ý sử dụng và xác minh email nếu được yêu cầu. Không bật thanh toán hoặc chọn gói trả phí.
3. Trong trang quản lý API của tài khoản, tạo/chọn khóa thuộc gói miễn phí/Standard đang được cung cấp. Giao diện dashboard có thể thay đổi; tên mục và giới hạn thực tế cần đọc trong tài khoản.
4. Kiểm tra Directions cho `driving-car` và `foot-walking`, hạn mức theo phút/ngày, thời điểm reset và hạn chế đường đi. Ghi lại con số từ dashboard vào biên bản nhóm. Không lấy số quota cũ từ bài hướng dẫn làm quota của tài khoản.
5. Sao chép khóa vào `ORS_API_KEY` trong `backend/.env`. Không cần đưa khóa cho web/mobile.
6. Khởi động lại backend, mở `/map`, chọn hai điểm, bấm tính tuyến. Nếu 503 `ROUTING_UNCONFIGURED`: biến chưa được đọc hoặc đang chạy tiến trình cũ. Nếu `ROUTING_KEY_REJECTED`: kiểm tra khóa/quyền/hạn mức tài khoản. Nếu 429: chờ hạn mức reset hoặc thử lại theo dashboard.

Backend gọi `POST https://api.openrouteservice.org/v2/directions/{profile}/geojson`; khóa ở header Authorization, tọa độ trong body theo `[longitude, latitude]`. Giới hạn local mặc định cách nhau ít nhất 2 giây trên một backend instance và ngừng gọi tiếp 60 giây khi upstream trả 429. Đây là bảo vệ local, **không phải quota miễn phí của tài khoản**. Không tính tuyến theo mỗi lần gõ hoặc cập nhật GPS.

Nguồn: [Directions: requests/return types](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types), [HeiGIT Account](https://account.heigit.org/).

## 3. Xác định đúng Supabase của nhóm

1. Cấu hình database local hiện dùng tài khoản dạng `postgres.<project-ref>`; mã đọc được là **`cyqvqehhjpvwovdzscxm`**. Đây là suy ra từ cấu hình hiện có, chưa phải xác nhận quyền truy cập dashboard.
2. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard) bằng tài khoản nhóm. Đối chiếu project ref trong URL với mã trên: [mở dự án đang cấu hình](https://supabase.com/dashboard/project/cyqvqehhjpvwovdzscxm).
3. Nếu không thấy dự án, nhờ TV2/người quản lý Supabase mời vào đúng tổ chức/dự án hoặc cung cấp cấu hình qua kênh bí mật của nhóm. **Không tạo dự án mới** và không đổi DB_URL để giải quyết việc thiếu quyền.
4. Trong Connect/Settings của đúng dự án, xác nhận Project URL. Với cấu hình chuẩn, URL là `https://cyqvqehhjpvwovdzscxm.supabase.co`; điền URL thực tế vào `SUPABASE_URL`. Không dùng hostname PostgreSQL pooler làm Storage URL.
5. Mở **Settings → API Keys**. Theo tài liệu Supabase hiện hành, ưu tiên server secret key `sb_secret_...` và điền vào `SUPABASE_SECRET_KEY`. Nếu TV2 đã dùng legacy `service_role` JWT, module vẫn nhận ở `SUPABASE_SERVICE_ROLE_KEY`; không vô hiệu hóa/rotate khóa chung khi chưa thống nhất với nhóm. Khi cả hai có giá trị, `SUPABASE_SECRET_KEY` được ưu tiên.
6. Không dùng `anon`/publishable key cho tác vụ server này. Quyền người dùng vẫn do JWT hiện có của VISTA kiểm tra ở backend; việc dùng Storage không thay đổi đăng nhập của nhóm.

Module gửi secret mới bằng header `apikey`; chỉ legacy JWT mới dùng thêm `Authorization: Bearer`. Xem [API keys hiện hành của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## 4. Tạo bucket trong dự án dùng chung

1. Vào **Storage → New bucket** trong đúng dự án trên. Nếu đã có bucket dành cho ảnh cộng đồng của nhóm, kiểm tra và dùng lại thay vì tạo trùng.
2. Tên/ID đề xuất: `community`; để **Public = OFF** (private).
3. Giới hạn file **5 MiB = 5.242.880 bytes**; MIME cho phép: `image/jpeg`, `image/png`. Backend cũng kiểm tra nội dung ảnh thật và giới hạn 25 triệu điểm ảnh.
4. Điền ID bucket thực tế vào `COMMUNITY_STORAGE_BUCKET`. Mỗi bài tối đa 4 ảnh.
5. Không tạo policy mở upload/xóa cho tất cả người dùng. Web/mobile chỉ gọi VISTA; backend kiểm tra JWT, quyền chủ ảnh và khóa object tự sinh trước khi dùng quyền Storage phía server.
6. Ảnh được phục vụ qua `/api/v1/post-media/{id}` sau khi kiểm tra bài còn công khai. Vì bucket private, bài ẩn/xóa không bị bypass bằng một public Storage URL.

Nguồn: [Tạo bucket](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## 5. Chạy và xác minh sau khi điền khóa

Tại root repository, dùng JDK 21 hoặc tùy chọn tương thích JDK mới hơn đã có của dự án:

```powershell
npm.cmd run dev:backend -- -PuseCurrentJvm
npm.cmd run dev --prefix web
```

Trên máy hiện tại có thể cần đặt `JAVA_HOME` tới JDK đã cài và `GRADLE_USER_HOME=D:\Android\Gradle`. Web local đang trỏ `http://localhost:8080/api/v1`; Android emulator dùng `http://10.0.2.2:8080/api/v1`. Với điện thoại thật, dùng IP LAN của máy chạy backend, không dùng `localhost`/`10.0.2.2`.

Kiểm tra thủ công: chọn hai điểm và tính tuyến ô tô/đi bộ; tạo bài với một JPEG/PNG; tải lại và xem ảnh; dùng tài khoản thứ hai thử sửa/xóa; thử hủy ảnh trước khi gửi và thử file sai định dạng. Không đưa giá trị khóa vào bằng chứng. Chỉ đánh dấu ORS/Storage thật đạt sau khi chạy thành công với dịch vụ thật.

Upload chưa gắn vào bài có hạn 24 giờ. Tác vụ cleanup chạy định kỳ, xóa ảnh hết hạn hoặc đã bị bỏ/xóa bài; nếu Storage lỗi thì giữ trạng thái chờ để thử lại. Khi tạo bài lỗi, bản nháp còn giữ và retry sử dụng cùng mã yêu cầu để tránh trùng bài.

Giới hạn vận hành của module có thể cấu hình bằng `VISTA_COMMUNITY_MAX_PHOTO_BYTES` (mặc định 5242880, chỉ được giảm trong trần schema), `VISTA_COMMUNITY_MAX_PENDING_UPLOADS` (mặc định 12) và `VISTA_COMMUNITY_UPLOAD_TTL_HOURS` (mặc định 24). Trần API/schema vẫn là 4 ảnh mỗi bài và 5 MiB mỗi ảnh; tăng vượt trần cần thay contract/migration mới. Chu kỳ cleanup dùng thuộc tính `vista.community.cleanup-delay-ms` mặc định 60000.
