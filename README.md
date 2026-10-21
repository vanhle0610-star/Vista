# VISTA Vietnam Smart Travel

VISTA là nền tảng du lịch thông minh toàn diện tại Việt Nam (hỗ trợ cả ứng dụng Mobile và Cổng thông tin Web) giúp khám phá điểm đến, lập lịch trình nhóm tối ưu bằng AI, quản lý ngân sách & thủ quỹ chuyến đi minh bạch, chia sẻ vị trí có sự đồng thuận opt-in, và bảng điều khiển quản trị (Admin Console).

## Trạng thái

Đã hoàn thành nền tảng Tuần 1: Monorepo modular monolith, kết nối Supabase PostgreSQL 17, Flyway baseline 30 bảng, Spring Boot health/error/security/OpenAPI, Expo Router với UI/auth validation, Next.js Web Portal (du khách & admin), contract tooling OpenAPI 3.1 và CI.

## 📖 Tài liệu quy chuẩn bắt buộc cho cả nhóm
- 📐 **[Cấu trúc thư mục dự án](PROJECT_STRUCTURE.md):** Bản đồ thư mục toàn diện và phân chia module theo 5 thành viên (M1 - M5).
- 📜 **[Quy chuẩn lập trình & Quy tắc trước khi code](TEAM_CODING_RULES.md):** Bắt buộc đọc trước khi viết code để đảm bảo code đồng nhất 100%, không conflict.
- 🤝 **[Hướng dẫn đóng góp & Quy trình Git](CONTRIBUTING.md):** Quy tắc tạo nhánh, commit và mở Pull Request.

## Phiên bản

- Java toolchain 21; Spring Boot 4.1.1; Gradle Wrapper 9.8.1.
- PostgreSQL 17 Alpine; Flyway do Spring Boot quản lý.
- Node 22.13.1; Expo SDK 57.0.30; React Native 0.86.3; React 19.2.3.
- Next.js 16.4.2; React 19.3.0.

## Cấu trúc

`backend/`, `mobile/`, `web/`, `contracts/openapi/`, `database/`, `docs/`, `infra/`, `scripts/` và `.github/` tách theo ownership.

## Yêu cầu

JDK 21, Node 22.13+, npm 10+, Docker Desktop/Engine có Compose. Máy hiện tại có thể dùng JDK mới hơn để tải toolchain 21 qua Gradle, nhưng CI luôn dùng JDK 21.

## Khởi động nhanh

PowerShell:

```powershell
Copy-Item .env.example .env
# đổi DB_PASSWORD trong .env và backend/.env hoặc export biến tương đương
.\scripts\dev.ps1 setup
.\scripts\dev.ps1 db-up
$env:DB_PASSWORD='mật-khẩu-trùng-với-.env'
.\scripts\dev.ps1 backend
```

Terminal khác: `make setup`, `make db-up`, `make backend-run`. Swagger tại `http://localhost:8080/swagger-ui.html`, health tại `http://localhost:8080/api/v1/health`.

Mobile: sao chép `mobile/.env.example` thành `mobile/.env.local`, đổi URL thành IPv4 LAN khi dùng điện thoại thật, sau đó `cd mobile && npm start`. Android emulator dùng `10.0.2.2`; web/iOS simulator có thể dùng localhost tùy môi trường. Web: `cd web && npm run dev`, mở `http://localhost:3000`.

## Kiểm tra

`backend/gradlew.bat spotlessCheck test build`, `mobile: npm run typecheck && npm run lint && npm test`, `web: npm run typecheck && npm run lint && npm run build`, `contracts: npm run api:validate && npm run api:generate`. Integration test PostgreSQL tự bỏ qua nếu thiếu Docker và phải chạy trong CI/máy có Docker.

## Môi trường và secrets

Root `DB_PASSWORD` chỉ cho Compose. Backend dùng `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SPRING_PROFILES_ACTIVE`, `SERVER_PORT`, `CORS_ALLOWED_ORIGINS`; `JWT_SIGNING_KEY` và `AI_API_KEY` chưa được code Week 1 sử dụng. Mobile chỉ công khai `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_USE_MOCK_AUTH`; web chỉ công khai `NEXT_PUBLIC_API_URL`. Không đặt secret trong biến `EXPO_PUBLIC_*`/`NEXT_PUBLIC_*`.

## Git và ownership

Nhánh `feature/*`/`fix/*` tạo từ `develop`, PR vào `develop`, release vào `main`, Conventional Commits và review CODEOWNERS. Xem `CONTRIBUTING.md`.

## Xử lý lỗi thường gặp

- PostgreSQL không chạy: kiểm tra Docker, cổng 5432 và `docker compose logs postgres`.
- Migration lỗi: không sửa migration đã áp dụng; tạo migration mới và kiểm tra `flyway_schema_history`.
- Điện thoại không gọi API: cùng mạng, dùng IPv4 LAN, mở firewall cổng 8080, không dùng localhost.
- Thiếu biến: so sánh với các `.env.example`; Spring Boot không tự đọc file `.env`, cần export biến hoặc IDE run config.
- Dependency lỗi: dùng đúng Node `.nvmrc`, `npm ci`, và `npx expo install --fix` trong mobile.

Tài liệu chi tiết nằm trong `docs/`; SRS gốc vẫn được giữ nguyên tại root để truy vết.
