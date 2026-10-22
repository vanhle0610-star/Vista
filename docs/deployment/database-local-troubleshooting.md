# Lỗi database/backend local sau khi cập nhật dev

## Nguyên nhân đã xác minh

Ngày 22/10/2026, kết nối JDBC tới Supabase thành công với cấu hình hiện có. Backend không mở được cổng 8080 vì Flyway dừng lúc startup:

```text
Detected resolved migration not applied to database: 202610210900.
```

Database đã áp dụng 6 migration, mới nhất `202611091001`, và có 60 điểm đến. File TV5 `V202610210900__tv5_map_community_constraints.sql` là thay đổi local chưa áp dụng, có version thấp hơn database. Các chức năng bản đồ/GPS tuần 1–2 hiện không cần DDL này; dịch vụ community còn là stub.

## Cách xử lý trên máy local hiện tại

Đã bổ sung trong **hai file local bị Git ignore** `backend/.env` và `backend/run-backend.bat`:

```dotenv
SPRING_FLYWAY_IGNORE_MIGRATION_PATTERNS=*:future,versioned:ignored
```

Theo [cấu hình chính thức của Flyway](https://documentation.red-gate.com/fd/flyway-ignore-migration-patterns-setting-277579002.html), pattern này cho phép validate bỏ qua migration versioned cũ đang ở trạng thái Ignored. Migration TV5 **vẫn chưa được áp dụng**. Đây là cấu hình local để chạy các chức năng đã có; không đổi cấu hình production hoặc đánh dấu DDL đã hoàn thành.

Không tắt Flyway, không tắt validate checksum của migration đã áp dụng, không bật out-of-order, không repair history, không sửa schema và không thay mật khẩu. Khi TV5 cần persistence/DDL này, phải review và áp dụng migration theo quy trình của nhóm rồi bỏ ngoại lệ local tương ứng.

`GOOGLE_CLIENT_ID` trong backend và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` của web đã khớp giá trị người dùng cung cấp, nên giữ nguyên. Chưa kiểm thử đăng nhập bằng tài khoản Google thật trong lần sửa này.

## Chạy lại

Từ root repository:

```powershell
.\scripts\dev.ps1 backend
```

Hoặc chạy `run-backend.bat` từ thư mục `backend`. Cả hai cách đều có cấu hình local đã sửa. Không chạy `bootRun` trần từ IDE/shell nếu chưa nạp biến trong `.env`.

## Kết quả kiểm tra

- Build backend mới: `gradlew.bat --offline bootJar --console=plain --no-daemon` đạt.
- JDBC SELECT trong transaction read-only: kết nối thành công, đọc được history và 60 điểm đến.
- Startup: validate thành công; không có migration cần chạy. Seed: **0 inserted, 60 already existed**.
- `http://localhost:8080/api/v1/health`: HTTP 200, UP.
- `http://localhost:8080/actuator/health`: HTTP 200, UP.
- `http://localhost:8080/api/v1/destinations?page=0&size=3`: HTTP 200, 3 item/tổng 60.
- Web proxy `http://localhost:3000/api/v1/destinations?page=0&size=3`: HTTP 200.
- CORS cho `http://localhost:3000`: được backend chấp nhận.

Log local: `backend/build/logs/backend.stdout.log` và `backend.stderr.log`. Bản sao cấu hình trước khi sửa nằm trong `backend/build/db-connection-check/`; các file này bị Git ignore và không được đưa vào commit vì có thể chứa secrets.

Lưu ý về môi trường kiểm tra: JDBC chạy bên trong sandbox của công cụ báo SSL handshake EOF, nhưng cùng cấu hình chạy ngoài sandbox kết nối ngay. Đây là hạn chế của môi trường công cụ, không phải bằng chứng sai mật khẩu hoặc cần tắt SSL.
