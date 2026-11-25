# Báo cáo rà soát vấn đề VISTA

**Ngày rà soát:** 20/11/2026  
**Phạm vi:** Web, Mobile, Backend, AI service, OpenAPI contract và dữ liệu điểm đến  
**Nguyên tắc:** Chỉ kiểm tra và báo cáo; không sửa mã nguồn hoặc dữ liệu hiện hữu.

## 1. Kết luận điều hành

VISTA **chưa đạt trạng thái sẵn sàng để merge/release**. Các quality gate chính của Web, Mobile và Backend đều đang đỏ. OpenAPI contract hợp lệ nhưng còn cảnh báo. Bộ test AI chưa thể chạy trong môi trường hiện tại vì dự án không khai báo/cài `pytest`.

Ưu tiên cao nhất là: (1) xử lý lỗi lời mời Backend và dữ liệu `opening_hours`, (2) sửa regression/đồng bộ lại đặc tả fallback của route planner Web, (3) đưa Mobile về trạng thái typecheck + lint + test xanh, sau đó mới dọn lint diện rộng và chuẩn hóa dữ liệu AI.

## 2. Ma trận kết quả

| Thành phần | Kiểm tra | Kết quả | Tóm tắt |
|---|---|---:|---|
| Web | `npm run typecheck` | Đạt | TypeScript không báo lỗi trước khi lint chạy |
| Web | `npm run lint` | Không đạt | Lệnh mặc định quét cả generated/vendor artifacts; riêng `src`, `scripts`, `next.config.ts` có **203 lỗi, 126 cảnh báo** |
| Web | `npm test` | Không đạt | Route planner: 1 assertion không còn đúng với hành vi fallback OSRM |
| Mobile | `npm run typecheck` | Không đạt | **2 lỗi** TypeScript |
| Mobile | `npm run lint` | Không đạt | **27 lỗi, 36 cảnh báo** |
| Mobile | `npm test` | Không đạt | **1/90 test thất bại**, 22/23 suite đạt; test Discovery timeout |
| Backend | `gradlew spotlessCheck` | Không đạt | Vi phạm format ở 5 file Java |
| Backend | `gradlew test` | Không đạt | **2/537 test thất bại**, 17 test bị skip |
| OpenAPI | validate + generate | Đạt có cảnh báo | Hợp lệ; 3 cảnh báo, generated types không tạo diff mới |
| AI service | `python -m pytest -q` | Chưa chạy được | Python hiện tại không có `pytest`; `requirements.txt` cũng không khai báo dependency test |

## 3. Vấn đề theo mức độ ưu tiên

### P0 — Chặn merge/release

#### 3.1 Backend: luồng chấp nhận lời mời trả 403 cho đúng người nhận

- Test thất bại: `NotificationRealIntegrationTest.acceptInvitation_notifiesInviter`.
- Thực tế: user B chấp nhận lời mời gửi tới `userb@gmail.com` nhưng service trả `403 FORBIDDEN`, cho rằng đang đăng nhập bằng tài khoản khác.
- Tác động: người dùng có thể không tham gia được chuyến đi qua lời mời; thông báo `INVITE_ACCEPTED` cho người mời cũng không được tạo.
- Khu vực cần kiểm tra: đối chiếu identity/email trong `InvitationService`, dữ liệu principal của test và thay đổi gần đây ở invitation repository/controller.

#### 3.2 Backend: seed `opening_hours` sai schema

- Test `OpeningHoursValidationTest` phát hiện điểm `châu battery power` có JSON chỉ gồm khóa `open`, `close`, thay vì đủ `mon`…`sun`.
- Tác động: AI scheduler/hiển thị giờ mở cửa có thể đọc sai hoặc loại điểm đến; migration/seed không còn đáp ứng contract 7 ngày.
- Cần sửa đồng thời nguồn seed chuẩn và các bản sao sinh ra, sau đó chạy lại kiểm tra toàn bộ dữ liệu.

#### 3.3 Mobile: không biên dịch TypeScript sạch

- `CommunityTools.test.tsx:37`: giá trị `"denied"` không tương thích `PermissionStatus`.
- `CommunityTools.tsx:284`: dùng `StyleSheet.absoluteFillObject`, API/type hiện tại chỉ cung cấp `absoluteFill`.
- Tác động: quality gate/CI typecheck thất bại; có nguy cơ build ứng dụng bị chặn.

#### 3.4 Web route planner: test và hành vi runtime không còn cùng contract

- Test tại `web/scripts/test-route-planner.mjs:49` kỳ vọng thiếu cấu hình routing sẽ reject với “Chưa cấu hình”.
- Mã hiện tại ở `web/src/features/map-location/routing/routes.ts` chuyển sang OSRM khi ORS không cấu hình/offline, nên promise không reject.
- Tác động: CI đỏ và yêu cầu sản phẩm không rõ ràng. Nếu fallback là chủ đích thì phải cập nhật test để xác nhận tuyến OSRM; nếu không, cần khôi phục lỗi cấu hình rõ ràng.

### P1 — Rủi ro chức năng/chất lượng cao

#### 3.5 Mobile Discovery test timeout và Jest không thoát sạch

- `DiscoverScreen.test.tsx:81` vượt timeout 5 giây.
- Tổng kết: 1 test fail, 89 pass; Jest phải `forceExit` và gợi ý kiểm tra open handles.
- Tác động: test không ổn định, có thể che giấu request/timer chưa cleanup và làm CI chậm/flaky.

#### 3.6 Lint React/React Native phát hiện nhiều mẫu có rủi ro render

- Mobile: gọi setState đồng bộ trong effect, đọc ref khi render, gọi `Date.now()` khi render, function được dùng trước khai báo, chuỗi JSX chưa escape.
- Web: riêng mã nguồn/scripts có 203 lỗi; nhóm nổi bật là `any` diện rộng, setState trong effect và đọc `mapRef.current` khi render ở `GroupMapTab`.
- Tác động: render lặp, state khó đoán, giảm độ an toàn kiểu và gây lỗi khi nâng React/Next.

#### 3.7 Cấu hình lint Web quét artifact sinh tự động

- `npm run lint` quét `public/map-assets` và thư mục lồng `web/web/.next`, tạo tổng cộng 5.875 vấn đề trong lần chạy đầy đủ.
- Đây phần lớn là mã vendor/generated, không nên được xem như source lint.
- Tác động: tín hiệu lint bị nhiễu, log rất lớn, khó phát hiện lỗi thật và tốn thời gian CI.
- Cần bổ sung ignore cho `.next`, thư mục build lồng, map assets/vendor; sau đó giữ gate nghiêm cho `src`, config và script do đội phát triển sở hữu.

#### 3.8 Backend format gate thất bại

- Spotless báo vi phạm ở `TravelScheduler.java`, `InvitationController.java`, `InvitationService.java`, `InvitationControllerTest.java`, `InvitationServiceTest.java`.
- Tác động: CI chặn ngay trước test nếu pipeline chạy `spotlessCheck test`.

### P2 — Nợ dữ liệu, contract và công cụ

#### 3.9 Dữ liệu điểm đến còn bất thường

- Báo cáo mới nhất quét 2.294 điểm/63 tỉnh, ghi nhận **13 bất thường**: 2 tên trùng và 11 giá đồ uống/chè/cà phê vượt ngưỡng heuristic.
- Báo cáo plausibility cũ (645 điểm) còn **110 cờ cần xem xét**: 10 cụm qua biển, 77 tọa độ lệch cụm tỉnh, 7 lệch giá theo nhóm, 7 điểm có thu phí nhưng giá 0, 7 sai khớp tỉnh/landmark, 2 giá công viên quá thấp.
- Lưu ý: nhiều cờ tọa độ có thể là điểm xa trung tâm hợp lệ; cần human review, không sửa hàng loạt tự động.

#### 3.10 OpenAPI còn 3 cảnh báo

- Server URL trỏ localhost.
- `/health` và `/auth/login` thiếu response 4XX trong đặc tả.
- Tác động: contract chưa mô tả đầy đủ lỗi client và chưa có server production/staging rõ ràng.

#### 3.11 AI test toolchain chưa tái lập được

- `requirements.txt` chỉ có runtime dependencies, không có `pytest` hoặc file requirements-dev riêng.
- Tác động: máy mới/CI không thể chạy test AI theo lệnh chuẩn nếu không có dependency ngầm từ môi trường.

#### 3.12 Working tree quá lớn và khó review

- Có khoảng **1.002** entry thay đổi/untracked; diff tracked hiện khoảng 39.280 dòng thêm và 11.318 dòng xóa.
- Phần lớn untracked là ảnh điểm đến; ngoài ra có code, SQLite DB, seed CSV và script thử nghiệm trộn chung.
- Tác động: khó review, dễ commit nhầm artifact/dữ liệu nhị phân, tăng thời gian clone/CI và rủi ro xung đột.

## 4. Kế hoạch xử lý đề xuất

1. **Khôi phục Backend xanh:** sửa identity check của invitation, chuẩn hóa `opening_hours`, chạy `spotlessApply` có review, rồi chạy lại toàn bộ 537 test.
2. **Chốt contract route fallback:** xác nhận ORS→OSRM là hành vi mong muốn; cập nhật test hoặc runtime tương ứng.
3. **Khôi phục Mobile xanh:** sửa 2 lỗi typecheck, test timeout/open handle, rồi xử lý 27 lỗi lint theo nhóm.
4. **Làm sạch Web lint:** ignore generated/vendor trước, sau đó xử lý 203 lỗi thuộc source theo từng module; không hạ rule toàn cục chỉ để qua CI.
5. **Chuẩn hóa AI test dependency:** thêm requirements-dev/pytest và chạy toàn bộ test AI trong môi trường tái lập.
6. **Triage dữ liệu:** review 13 anomaly mới trước; sau đó tái chạy plausibility audit trên toàn bộ 2.294 điểm để thay thế báo cáo 645 điểm đã cũ.
7. **Tách thay đổi thành PR nhỏ:** code invitation, AI/replanner, seed/data, ảnh, và UI planner nên thành các commit/PR riêng.

## 5. Tiêu chí hoàn tất

- Web: typecheck, lint source và test đều exit 0.
- Mobile: typecheck, lint và 100% test exit 0; Jest không cần `forceExit` để che open handle.
- Backend: spotless + toàn bộ test exit 0, không tăng số test skip.
- AI: test chạy được từ dependency được khai báo và exit 0.
- OpenAPI: không còn warning hoặc warning được ghi nhận/waive có lý do.
- Data: anomaly được phân loại thành lỗi thật/false positive và báo cáo plausibility được tạo lại trên dataset hiện hành.
