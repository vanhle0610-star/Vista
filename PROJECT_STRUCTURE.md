# CẤU TRÚC THƯ MỤC DỰ ÁN VISTA (PROJECT STRUCTURE)

> **VISTA — Vietnam Smart Travel, Collaborative Planning & Group Safety Platform**  
> Kiến trúc: **Monorepo (Modular Monolith)**  
> Mô hình tổ chức: **Phân chia theo 5 Actor (TV1 – TV5) Full-Stack Vertical Slice**

---

## 1. CÂY THƯ MỤC TOÀN DIỆN (DIRECTORY TREE)

```text
vista/
├── .github/                                # Quy trình CI/CD & quản trị GitHub
│   ├── workflows/                          # GitHub Actions Workflows
│   │   ├── ci-backend.yml                  # Kiểm tra Java, Gradle test, Spotless (TV2)
│   │   ├── ci-mobile.yml                   # Kiểm tra TypeScript, ESLint, Jest (TV1)
│   │   ├── ci-admin.yml                    # Kiểm tra TypeScript, Next.js build (TV1)
│   │   ├── ci-contract.yml                 # Lint OpenAPI & kiểm tra tính đồng bộ
│   │   └── deploy-backend.yml              # Pipeline build & deploy Docker backend (TV2)
│   ├── ISSUE_TEMPLATE/                     # Mẫu tạo Issue chuẩn
│   │   ├── bug_report.yml                  # Mẫu báo cáo lỗi
│   │   └── feature_request.yml             # Mẫu đề xuất tính năng
│   ├── PULL_REQUEST_TEMPLATE.md            # Template PR kèm checklist Definition of Done
│   └── CODEOWNERS                          # Phân quyền phụ trách review mã nguồn theo 5 Actor
│
├── backend/                                # Backend: Java 21, Spring Boot 4.x (Modular Monolith)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/vista/
│   │   │   │   ├── VistaApplication.java   # Main application entry point (TV2)
│   │   │   │   ├── common/                 # TV2: Hạ tầng dùng chung (Security, Web, Config, Audit)
│   │   │   │   │   ├── audit/              # TV2: AuditLogService interface & stub
│   │   │   │   │   ├── config/             # Cấu hình OpenAPI, VistaProperties
│   │   │   │   │   ├── security/           # Spring Security, PasswordEncoder, CORS, JWT
│   │   │   │   │   └── web/                # GlobalExceptionHandler, CorrelationId, Health
│   │   │   │   ├── auth/                   # TV2: Đăng ký, đăng nhập, JWT, vai trò người dùng
│   │   │   │   ├── user/                   # TV2: Hồ sơ cá nhân, liên hệ khẩn cấp
│   │   │   │   ├── trip/                   # TV2: Chuyến đi cốt lõi, TripAccessService (isMember, isOwner)
│   │   │   │   ├── destination/            # TV1: Điểm đến du lịch, DestinationQueryService
│   │   │   │   ├── favorite/               # TV1: Danh sách địa điểm yêu thích
│   │   │   │   ├── itinerary/              # TV3: Lịch trình chi tiết theo ngày & điểm dừng
│   │   │   │   ├── invitation/             # TV3: Lời mời tham gia chuyến đi (link/code)
│   │   │   │   ├── voting/                 # TV3: Đề xuất & biểu quyết địa điểm nhóm
│   │   │   │   ├── notification/           # TV3: NotificationService (In-app, push)
│   │   │   │   ├── budget/                 # TV4: Ngân sách & chia tiền chuyến đi (Equal/Custom)
│   │   │   │   ├── ai/                     # TV4: Client wrapper LLM (Gemini), prompt & quota
│   │   │   │   ├── community/              # TV5: Bài viết cộng đồng, bình luận, review
│   │   │   │   ├── moderation/             # TV5: Báo cáo vi phạm, hàng đợi kiểm duyệt
│   │   │   │   ├── location/               # TV5: Chia sẻ vị trí nhóm có đồng thuận (opt-in)
│   │   │   │   ├── safety/                 # TV5: Điểm hẹn meetup, check-in, an toàn nhóm
│   │   │   │   └── admin/                  # TV1: API phục vụ trang quản trị CMS
│   │   │   └── resources/
│   │   │       ├── application.yml         # Cấu hình chính (chế độ dev mặc định)
│   │   │       ├── application-dev.yml     # Cấu hình môi trường Local Docker
│   │   │       ├── application-demo.yml    # Cấu hình môi trường Demo Supabase Pooler
│   │   │       ├── application-prod.yml    # Cấu hình môi trường Production
│   │   │       └── db/migration/           # Flyway SQL migrations (V202610171200__baseline_schema.sql)
│   │   └── test/                           # Kiểm thử tự động (Unit test, Integration test)
│   │       └── java/com/vista/             # HealthControllerTest, PostgresMigrationTest,...
│   ├── gradle/wrapper/                     # Gradle Wrapper 9.8.1
│   ├── build.gradle                        # Định nghĩa dependencies & plugin Spring Boot (TV2)
│   ├── settings.gradle
│   ├── gradlew
│   ├── gradlew.bat
│   ├── Dockerfile                          # Multi-stage Docker build cho backend
│   └── .env.example                        # Mẫu biến môi trường cho backend
│
├── mobile/                                 # Ứng dụng Mobile: React Native, Expo Router, TypeScript
│   ├── assets/                             # Tài nguyên hình ảnh, logo, splash screen, icon
│   ├── src/
│   │   ├── app/                            # TV1: File-based routing theo Expo Router
│   │   │   ├── _layout.tsx                 # Root layout & providers
│   │   │   ├── index.tsx                   # Màn hình điều hướng gốc
│   │   │   ├── showcase.tsx                # Màn hình showcase kiểm tra UI component
│   │   │   ├── (auth)/                     # TV2: Nhóm màn hình xác thực (login, register)
│   │   │   ├── (tabs)/                     # TV1: Thanh điều hướng tab chính
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── discover.tsx            # TV1: Tab khám phá điểm đến
│   │   │   │   ├── trips.tsx               # TV2: Tab chuyến đi của tôi
│   │   │   │   └── profile.tsx             # TV2: Tab hồ sơ cá nhân
│   │   │   ├── destination/                # TV1: Tuyến đường chi tiết điểm đến
│   │   │   └── trip/                       # TV2/TV3: Tuyến đường tạo & quản lý chuyến đi
│   │   ├── features/                       # Mã nguồn phân tách theo từng Actor
│   │   │   ├── discovery/                  # TV1: Khám phá điểm đến du lịch
│   │   │   ├── destinations/               # TV1: Danh mục & chi tiết điểm đến
│   │   │   ├── favorites/                  # TV1: Yêu thích địa điểm
│   │   │   ├── auth/                       # TV2: Luồng xác thực, form validation
│   │   │   ├── profile/                    # TV2: Quản lý hồ sơ người dùng
│   │   │   ├── trips/                      # TV2: Quản lý chuyến đi cốt lõi
│   │   │   ├── itinerary/                  # TV3: Lịch trình chuyến đi theo ngày
│   │   │   ├── group/                      # TV3: Thành viên nhóm & lời mời
│   │   │   ├── voting/                     # TV3: Biểu quyết đề xuất địa điểm
│   │   │   ├── budget/                     # TV4: Chi tiêu & chia tiền
│   │   │   ├── ai-planner/                 # TV4: Lập lịch trình bằng AI (Gemini)
│   │   │   ├── map/                        # TV5: MapViewAdapter, bản đồ, tọa độ
│   │   │   ├── safety/                     # TV5: Điểm hẹn, an toàn nhóm, chia sẻ vị trí
│   │   │   └── community/                  # TV5: Bảng tin, bài viết, đánh giá, báo cáo
│   │   ├── components/                     # Các UI Component tái sử dụng
│   │   │   ├── ui/                         # TV1: AppButton, AppInput, AppCard, AppText
│   │   │   ├── layout/                     # TV1: ScreenContainer
│   │   │   └── feedback/                   # TV1: LoadingState, ErrorState, EmptyState
│   │   ├── services/                       # Dịch vụ tầng dưới
│   │   │   ├── api/                        # TV1: HTTP API Client (Axios + RFC 9457 Problem Details)
│   │   │   └── storage/                    # TV2: Quản lý lưu trữ bảo mật (Expo SecureStore)
│   │   ├── providers/                      # TV1: AppProviders (React Query, Context)
│   │   ├── hooks/                          # Custom React Hooks
│   │   ├── theme/                          # TV1: Design tokens (màu sắc, typography, spacing)
│   │   ├── constants/                      # Hằng số toàn cục
│   │   ├── types/                          # TV1: Kiểu dữ liệu TypeScript & api.generated.ts
│   │   └── utils/                          # Tiện ích bổ trợ (helpers)
│   ├── app.json                            # Cấu hình Expo application
│   ├── eas.json                            # Cấu hình Expo Application Services (EAS Build)
│   ├── package.json                        # TV1 quản lý thư viện
│   ├── tsconfig.json                       # Cấu hình TypeScript Strict Mode
│   ├── eslint.config.js                    # Cấu hình ESLint cho mobile
│   ├── .prettierrc.json
│   └── .env.example                        # Mẫu biến môi trường di động (EXPO_PUBLIC_*)
│
├── admin/                                  # Ứng dụng Web Quản trị: Next.js (App Router), TypeScript (TV1)
│   ├── public/                             # Tài nguyên tĩnh web (icons, images)
│   ├── src/
│   │   ├── app/                            # Next.js App Router
│   │   │   ├── layout.tsx                  # Root layout
│   │   │   ├── page.tsx                    # Landing / Trang chuyển hướng
│   │   │   ├── login/                      # Trang đăng nhập quản trị
│   │   │   └── (protected)/                # Khu vực yêu cầu quyền ADMIN/MODERATOR
│   │   │       ├── dashboard/              # Thống kê tổng quan hệ thống
│   │   │       ├── destinations/           # TV1: Quản lý danh mục & địa điểm CMS
│   │   │       ├── users/                  # TV2: Quản lý người dùng & phân quyền
│   │   │       └── moderation/             # TV5/TV1: Hàng đợi kiểm duyệt nội dung
│   │   ├── features/                       # Logic tính năng riêng cho admin
│   │   ├── components/                     # UI components dùng chung (AdminShell, Sidebar)
│   │   ├── lib/                            # API client & tiện ích quản trị
│   │   └── types/                          # Kiểu dữ liệu TypeScript cho admin
│   ├── next.config.ts                      # Cấu hình Next.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile                          # Multi-stage Docker build cho admin web
│   └── .env.example                        # Mẫu biến môi trường cho admin (NEXT_PUBLIC_*)
│
├── contracts/                              # OpenAPI Specification (Single Source of Truth)
│   ├── openapi/
│   │   ├── openapi.yaml                    # Hợp đồng API chuẩn OpenAPI 3.1
│   │   ├── paths/                          # Định nghĩa chi tiết từng endpoint
│   │   ├── schemas/                        # Định nghĩa cấu trúc request/response JSON
│   │   └── examples/                       # Dữ liệu payload mẫu phục vụ mock
│   ├── package.json                        # Scripts: api:validate, api:generate, api:mock
│   └── package-lock.json
│
├── database/                               # Quản lý cơ sở dữ liệu & dữ liệu hạt giống (Seed Data)
│   ├── seed/
│   │   └── destinations/                   # TV1: Dữ liệu địa điểm du lịch (Đà Nẵng, Huế, Hội An)
│   │       ├── demo_destinations_seed.csv  # 30 địa điểm du lịch có nguồn và tọa độ xác minh
│   │       └── sample.schema.csv           # Cấu trúc file CSV chuẩn hóa phục vụ nhập liệu
│   └── README.md                           # Hướng dẫn kiến trúc ERD, Flyway và seed dữ liệu
│
├── docs/                                   # Toàn bộ tài liệu kỹ thuật & kiến trúc dự án
│   ├── requirements/                       # Báo cáo phân tích yêu cầu & Kế hoạch 8 tuần theo Actor
│   ├── architecture/                       # Kiến trúc hệ thống, backend, mobile, Actor-driven
│   ├── diagrams/                           # Sơ đồ kiến trúc Mermaid, sơ đồ luồng
│   ├── api/                                # Hướng dẫn tích hợp API cho frontend
│   ├── deployment/                         # Hướng dẫn triển khai local, staging, production
│   ├── testing/                            # Chiến lược kiểm thử & Definition of Done
│   ├── decisions/                          # Các biên bản quyết định kiến trúc (ADR)
│   └── onboarding/                         # Tài liệu hướng dẫn cho lập trình viên mới
│
├── infra/                                  # Cấu hình hạ tầng triển khai (Docker, Nginx)
├── scripts/                                # Công cụ & script hỗ trợ phát triển (dev.ps1)
├── compose.yaml                            # Docker Compose khởi chạy PostgreSQL 17 Local
├── Makefile                                # Lệnh Make tiêu chuẩn cho môi trường Linux/macOS
├── README.md                               # Hướng dẫn tổng quan toàn dự án
├── TEAM_CODING_RULES.md                    # Quy chuẩn lập trình theo 5 Actor (BẮT BUỘC ĐỌC)
├── CONTRIBUTING.md                          # Quy chuẩn đóng góp, Git workflow & commit format
├── .editorconfig                           # Định dạng mã nguồn thống nhất cho IDE
├── .gitattributes                          # Chuẩn hóa line-ending (CRLF/LF)
├── .gitignore                              # Danh sách bỏ qua phiên bản Git
├── .env.example                            # Biến môi trường mẫu cấp root
└── .nvmrc                                  # Phiên bản Node.js tiêu chuẩn (v22)
```

---

## 2. PHÂN CÔNG QUẢN LÝ THƯ MỤC THEO 5 ACTOR (TEAM OWNERSHIP)

| Thành viên | Actor chính | Khu vực mã nguồn phụ trách trọn gói (Full-Stack Vertical Slice) |
|---|---|---|
| **TV1** | **Guest / Visitor** *(Khám phá địa điểm)* | `backend/.../destination/`, `favorite/`, `admin/`, `database/seed/`<br>`mobile/src/features/destinations/`, `discovery/`, `favorites/`<br>`mobile/src/app/`, `theme/`, `components/ui/`, `admin/` |
| **TV2** | **Registered User / Trip Owner** *(Tài khoản & Chuyến đi)* | `backend/.../common/`, `auth/`, `user/`, `trip/`, `db/migration/`<br>`mobile/src/features/auth/`, `profile/`, `trips/`, `services/storage/` |
| **TV3** | **Invited User / Trip Member** *(Cộng tác & Lịch trình)* | `backend/.../invitation/`, `itinerary/`, `voting/`, `notification/`<br>`mobile/src/features/itinerary/`, `group/`, `voting/` |
| **TV4** | **Trip Owner / Member** *(Chi phí & AI Planner)* | `backend/.../budget/`, `ai/`<br>`mobile/src/features/budget/`, `ai-planner/` |
| **TV5** | **Community / Safety User** *(Bản đồ, Cộng đồng & An toàn)* | `backend/.../community/`, `moderation/`, `location/`, `safety/`<br>`mobile/src/features/map/` (`MapViewAdapter`), `safety/`, `community/` |

---

## 3. NGUYÊN TẮC BẢO TOÀN CẤU TRÚC

1. **Giao tiếp giữa các Actor:** Module nghiệp vụ của Actor này gọi Actor khác thông qua Interface công khai (`TripAccessService`, `DestinationQueryService`, `NotificationService`, `MapViewAdapter`), tuyệt đối không inject trực tiếp Repository hay Entity nội bộ của nhau.
2. **Không tự ý tạo thư mục ngoài danh mục:** Khi cần phát triển một chức năng mới, lập trình viên đặt code vào đúng module nghiệp vụ đã định hình ở bảng trên.
3. **Contract-First:** Mọi thay đổi về cấu trúc API phải được cập nhật tại `contracts/openapi/openapi.yaml` trước khi tiến hành code ở backend hay mobile.
