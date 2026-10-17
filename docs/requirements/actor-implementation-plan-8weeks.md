# KẾ HOẠCH TRIỂN KHAI 8 TUẦN THEO 5 ACTOR (VISTA IMPLEMENTATION ROADMAP)

> **Dự án:** VISTA — Vietnam Travel Discovery & Collaborative Trip Planning Platform  
> **Quy mô:** Đội ngũ 5 thành viên (TV1 – TV5)  
> **Nguyên tắc:** Phân công theo **Actor**, thiết kế Use Case theo **luồng tương tác hoàn chỉnh**

---

## 1. TỔNG QUAN PHẠM VI & PHÂN CÔNG ACTOR

| Thành viên | Actor chính | Phạm vi sở hữu chức năng | Vai trò dùng chung | Sản phẩm bàn giao chính | Kịch bản Demo tuần 8 |
|---|---|---|---|---|---|
| **TV1** | **Guest / Visitor** *(Khách vãng lai)* | Khám phá điểm đến: Search, Filter, Destination Detail, Reviews, Favorites. | Khung Mobile dùng chung (`src/app/`, `theme/`, `components/ui/`), điều phối dữ liệu seed CSV, Web Admin tối giản. | Search, Filter, Detail, Favorites, khung Mobile, Web Admin. | Mở app ➔ tìm "cà phê" ➔ lọc Đà Nẵng ➔ xem chi tiết ➔ lưu yêu thích ➔ xem danh sách yêu thích. |
| **TV2** | **Registered User / Trip Owner** *(Người dùng & Chủ chuyến đi)* | Tài khoản & Chuyến đi cốt lõi: Auth (JWT), Profile, Create Trip, My Trips, Trip Management, Phân quyền Owner/Member. | Backend Core (`common/`, security, exception, audit), Flyway baseline, CI backend, ma trận RBAC, bộ test RLS. | Auth, Profile, Create Trip, My Trips, `TripAccessService`, `AuditLogService`. | Đăng nhập tài khoản A ➔ tạo chuyến đi "Khám phá Đà Nẵng 3 ngày" ➔ đặt ngày & ngân sách ➔ gửi lời mời cho B. |
| **TV3** | **Invited User / Trip Member** *(Thành viên nhóm & Cộng tác)* | Cộng tác chuyến đi nhóm: Nhận/duyệt lời mời, Thành viên nhóm, Lịch trình theo ngày, Đề xuất địa điểm, Biểu quyết (Voting). | Hệ thống thông báo In-App và Push Notification cho toàn bộ ứng dụng. | Invitations, Members, Itinerary, Proposals, Voting, `NotificationService`. | Tài khoản B mở lời mời ➔ chấp nhận tham gia ➔ thêm điểm dừng ngày 2 ➔ đề xuất địa điểm ➔ biểu quyết. |
| **TV4** | **Trip Owner / Member (Budget & AI)** *(Quản lý chi phí & Trợ lý AI)* | Chi phí & AI Planner: Thêm/sửa chi phí, phân loại, tính tổng ngân sách, chia tiền (Equal/Custom), AI Itinerary Suggestion (Gemini). | Định mức token/chi phí AI, công thức làm tròn tiền VND, AI Client Wrapper an toàn. | Expenses, Budget, Split Cost, AI Suggestions, prompt engineering. | Mở chuyến đi ➔ nhập tiền ăn & xe ➔ xem tổng chi phí & chia bình quân ➔ yêu cầu AI gợi ý ➔ lưu gợi ý vào lịch trình. |
| **TV5** | **Community / Safety User** *(Cộng đồng & An toàn)* | Bản đồ, Cộng đồng & An toàn: Map view, Check-in, Meetup point, Bảng tin cộng đồng, Báo cáo bài viết, Chia sẻ vị trí có đồng thuận (Opt-in). | Component `MapViewAdapter` dùng chung trên Mobile; API hàng đợi kiểm duyệt (Moderation) cho Web Admin. | Map, Check-in, Community Feed, Content Reports, Location Sharing, `MapViewAdapter`. | Mở bản đồ ➔ chọn điểm đến ➔ mở chỉ đường ➔ check-in điểm hẹn ➔ đăng bài chia sẻ ➔ báo cáo bài viết vi phạm. |

---

## 2. QUYẾT ĐỊNH KỸ THUẬT QUAN TRỌNG (D1 – D8)

| Mã | Quyết định kỹ thuật | Phương án thống nhất | Người chốt |
|---|---|---|---|
| **D1** | **Nguồn danh tính & Auth** | Supabase Auth cấp JWT; Spring Boot là resource server xác thực JWT; Mobile lưu an toàn qua Expo SecureStore. | **TV2** |
| **D2** | **Cách truy cập dữ liệu** | Mobile **không bao giờ** query DB trực tiếp; mọi nghiệp vụ đi qua Spring Boot REST API. Spring Boot kiểm tra phân quyền code logic; RLS là lớp bảo vệ thứ 2. | **TV2** |
| **D3** | **Cập nhật vị trí nhóm** | Polling 10–15 giây khi app đang mở; không chạy ngầm ngốn pin (background tracking) trong MVP. | **TV5** |
| **D4** | **Nhà cung cấp bản đồ** | Dùng MapLibre / OpenStreetMap qua abstraction `MapViewAdapter` do TV5 cung cấp. | **TV5** |
| **D5** | **Nhà cung cấp & Giới hạn AI** | Google Gemini (Gemini 2.5 Flash / Flash Lite); giới hạn token và tần suất gọi/ngày/người dùng. | **TV4** |
| **D6** | **Tính năng SOS & Cảnh báo** | Giữ tính năng bản đồ nhóm, điểm hẹn meetup và check-in; hoãn SOS nếu push notification chưa ổn định. | **Cả nhóm** |
| **D7** | **Ngôn ngữ giao diện** | Tiếng Việt chuẩn hóa 100% cho toàn bộ MVP. | **TV1** |
| **D8** | **Cơ chế mời thành viên** | Link mời (Deep Link) & mã mời (Invite Code) 6 ký tự làm trước; gửi email là tùy chọn bổ sung. | **TV3** |

---

## 3. LỘ TRÌNH CHI TIẾT 8 TUẦN (WEEK-BY-WEEK ROADMAP)

### Tuần 1: Nền tảng, Khung kiến trúc, Quyết định kỹ thuật & Spike
- **TV1:** Dựng khung Mobile Expo, TypeScript, Expo Router, theme tokens, UI component showcase, mẫu CSV địa điểm (≥ 30 địa điểm có nguồn cho Đà Nẵng, Huế, Hội An).
- **TV2:** Monorepo, Spring Boot Modular Monolith, Flyway baseline (30 bảng), Supabase connection pooler, ma trận RBAC, stub `TripAccessService` và `AuditLogService`.
- **TV3:** Phân tích luồng Owner ➔ Invitation ➔ Member; thiết kế cấu trúc DDL & OpenAPI cho invitations, itinerary, voting; stub `NotificationService`.
- **TV4:** Công thức tính tổng ngân sách, chia tiền VND; spike AI LLM trả JSON có cấu trúc; thiết kế DDL expenses & ai_generation_jobs.
- **TV5:** Spike GPS trên thiết bị di động thật; spike giải pháp bản đồ; component `MapViewAdapter`; thiết kế DDL posts, check_ins, location_shares.

### Tuần 2: Xác thực (Auth), Dữ liệu Điểm đến & Khung ứng dụng
- **TV1:** Route guard cho mobile; điều phối seed ≥ 60 địa điểm có ảnh và nguồn; hoàn thiện backend module `destination` (GET /destinations, GET /destinations/{id}).
- **TV2:** Xác thực JWT theo D1; `GET /users/me`, `PATCH /users/me`; triển khai bản thật `TripAccessService`; màn hình Login/Register/Profile trên Mobile; API tạo chuyến đi cơ bản.
- **TV3:** Entity & Repository cho invitations, itinerary, voting; tích hợp kiểm tra quyền qua `TripAccessService`; khung UI Itinerary & Members bằng mock data.
- **TV4:** UI Budget & Expense bằng dữ liệu giả lập; Entity & Service tính toán chia tiền với bộ 15 test cases chuẩn; module gọi LLM Gemini có schema validator.
- **TV5:** MapView adapter trên màn hình Map; cơ chế xin cấp quyền vị trí mượt mà (không crash khi từ chối).

### Tuần 3: Khám phá Điểm đến, Lời mời Chuyến đi & CRUD Lịch trình
- **TV1:** Hoàn thiện màn Discover, Search, Filter, Favorites và Destination Detail trên Mobile kết nối API thật; nạp đợt 2 (≥ 90 địa điểm).
- **TV2:** Hoàn thiện Create Trip, My Trips, chỉnh sửa chuyến đi; khung `AuditLogService`.
- **TV3:** API gửi lời mời, chấp nhận/từ chối tham gia; CRUD điểm dừng lịch trình (Itinerary Days & Items); sắp xếp thứ tự điểm đến.
- **TV4:** Màn hình nhập chi phí thực tế; tích hợp service tính tổng và chia chi phí theo đầu người.
- **TV5:** Tích hợp bản đồ xem chi tiết địa điểm và mở ứng dụng chỉ đường ngoài; khung giao diện feed cộng đồng.

### Tuần 4: Cộng tác Nhóm, Biểu quyết & Cổng Kiểm Soát #1 (Mid-term Gate)
- **TV1:** Kiểm thử E2E luồng khám phá và lưu yêu thích trên thiết bị thật; hoàn thiện dữ liệu giờ mở cửa dạng cấu trúc cho AI.
- **TV2:** Quản lý thành viên chuyến đi (Owner, Member, chuyển quyền chủ nhóm, rời nhóm); hoàn thiện bảo mật API.
- **TV3:** Cộng tác lịch trình đồng thời giữa 2 thiết bị; đề xuất địa điểm mới và biểu quyết (Voting); phát hiện xung đột lịch trình.
- **TV4:** Demo luồng quản lý chi phí kết nối API thật; tích hợp endpoint AI v0 trả về gợi ý lịch trình theo schema.
- **TV5:** Hiển thị vị trí thành viên trên Group Map; màn hình đồng thuận chia sẻ vị trí (Opt-in toggle).
- **HỌP CỔNG KIỂM SOÁT #1:** Cắt giảm các tính năng vượt quá nguồn lực (ví dụ: hoãn SOS nền nếu push chưa ổn định), bảo toàn các luồng bắt buộc.

### Tuần 5: Chi phí Nhóm & AI Itinerary Planner Thực Tế
- **TV1:** Rà soát chất lượng dữ liệu điểm đến cho AI Planner; kiểm thử tích hợp luồng chi phí.
- **TV2:** Rà soát phân quyền API private cho chi tiêu và lịch trình; hoàn thiện hồ sơ người dùng.
- **TV3:** Thẩm định logic lịch trình: kiểm tra trùng lặp thời gian; hỗ trợ TV4 lưu gợi ý AI thành điểm dừng lịch trình.
- **TV4:** Lưu trữ chi phí thật vào Database Supabase; so sánh ngân sách dự kiến vs thực chi; triển khai AI Planner đề xuất lịch trình theo prompt tiếng Việt.
- **TV5:** Hoàn thiện tính năng Check-in điểm hẹn; cơ chế tự động hết hạn chia sẻ vị trí.

### Tuần 6: Thông báo, Kiểm duyệt & Web Admin Tối Giản
- **TV1:** Triển khai Web Admin Next.js tối giản: đăng nhập Moderator/Admin, xem hàng đợi bài viết bị báo cáo, ẩn/khôi phục nội dung (gọi API của TV5).
- **TV2:** Xử lý phiên đăng nhập hết hạn, refresh token tự động; viết bộ test RLS theo 5 vai trò; rà soát audit log.
- **TV3:** Hoàn thiện `NotificationService` bản thật: thông báo In-App và Push Notification khi có lời mời hoặc lịch trình thay đổi.
- **TV4:** Xử lý ngoại lệ AI timeout/lỗi định dạng JSON; cho phép người dùng xem trước và tick chọn điểm dừng AI trước khi lưu vào chuyến đi.
- **TV5:** Hoàn thiện đăng bài cộng đồng, tải ảnh, gửi báo cáo vi phạm nội dung; cung cấp API báo cáo cho Web Admin của TV1.

### Tuần 7: Kiểm Thử Toàn Diện (End-to-End) & An Toàn Bảo Mật
- **TV1:** Kiểm thử hồi quy toàn bộ hệ thống theo Traceability Matrix; kiểm thử độ nhạy bộ lọc và tìm kiếm không dấu.
- **TV2:** Kiểm thử bảo mật: tấn công vượt quyền (IDOR - truy cập chuyến đi bằng ID người khác), kiểm thử phân quyền Owner vs Member.
- **TV3:** Kiểm thử đồng thời: 2 thành viên cùng sửa lịch trình và cùng biểu quyết; kiểm tra lời mời hết hạn.
- **TV4:** Kiểm thử tính toán chi phí với các ca số lẻ, thành viên không tham gia chia tiền; kiểm thử rate limit gọi AI.
- **TV5:** Kiểm thử quyền riêng tư: tắt chia sẻ vị trí, mất kết nối mạng (Offline mode), kiểm duyệt nội dung độc hại.

### Tuần 8: Đóng Băng Code (Code Freeze), Diễn Tập Demo & Bàn Giao
- **Cả nhóm:** Đóng băng toàn bộ API và mã nguồn; tạo bản build APK/Expo phát hành thử nghiệm.
- **TV2:** Sao lưu & phục hồi thử nghiệm Database (Backup & Restore); nạp bộ dữ liệu demo chuẩn.
- **Từng thành viên:** Diễn tập kịch bản demo cá nhân 5 phút chứng minh tính năng hoàn chỉnh của Actor mình phụ trách.
- **Bàn giao:** Toàn bộ mã nguồn trên GitHub, tài liệu kiến trúc, báo cáo kiểm định và video demo.

---

## 4. MA TRẬN PHỤ THUỘC & HẠN BÀN GIAO LIÊN-ACTOR

| Người nhận | Cần từ | Hạng mục bàn giao | Hạn giao chót | Mục đích sử dụng |
|---|---|---|---|---|
| **Cả nhóm** | **TV2** | Quyết định D1, D2 & Ma trận RBAC | T3–T4 W1 | Viết test phân quyền từ W2 |
| **Cả nhóm** | **TV2** | Flyway Baseline Migration (30 bảng) | T4 W1 | Mọi thành viên có DB nhất quán |
| **Cả nhóm** | **TV1** | Khung Mobile chạy được trên máy thật | T5 W1 | Dựng mọi màn hình từ W2 |
| **TV3, TV4, TV5** | **TV2** | `TripAccessService` (Stub ➔ Thật) | T5 W1 ➔ T4 W2 | Kiểm tra quyền thành viên chuyến đi |
| **TV3** | **TV2** | API Chuyến đi cơ bản (Tạo/Xem) | T5 W2 | Tạo lịch trình & lời mời ở W3 |
| **TV3, TV4** | **TV1** | `DestinationQueryService` bản thật | T4 W3 | Thêm điểm dừng & AI gợi ý địa điểm |
| **Cả nhóm** | **TV1** | Dữ liệu địa điểm seed (≥ 60 ➔ ≥ 90) | Cuối W2 ➔ Cuối W3 | Test mobile, AI và bản đồ |
| **TV4** | **TV3** | API Thành viên chuyến đi & Lịch trình | T5 W3 | Chia chi phí & lưu gợi ý AI |
| **TV1, TV2, TV3** | **TV5** | Component `MapViewAdapter` | T5 W2 | Nhúng bản đồ trên màn hình |
| **TV1** | **TV5** | API Danh sách báo cáo vi phạm | T3 W6 | Trang Web Admin kiểm duyệt |

---

*Kế hoạch 8 tuần này là văn bản điều hành phát triển chính thức của dự án VISTA.*
