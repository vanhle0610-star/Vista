# TV4 — Báo cáo triển khai Tuần 7–8

## Phạm vi

TV4 phụ trách quản lý chi phí chuyến đi, chia tiền VND, quyết toán công nợ và AI
Planner. Tuần 7 tập trung kiểm thử, phân quyền và xử lý lỗi. Tuần 8 đóng băng tính
năng, chuẩn bị dữ liệu demo và bàn giao.

## Hạng mục đã triển khai

### Expense và Budget

- Hoàn chỉnh contract CRUD với `PATCH /trips/{tripId}/expenses/{expenseId}`.
- Chỉ thành viên chuyến đi được truy cập Expense API.
- Chỉ người thanh toán hoặc Trip Owner được sửa/xóa khoản chi.
- Người thanh toán và tất cả người được chia tiền phải thuộc chuyến đi.
- Khi đổi số tiền, client bắt buộc gửi lại cách chia để tránh sai lệch công nợ.
- Khoản chi đã hủy không thể sửa hoặc hủy lại.
- Mobile API và hook đã hỗ trợ cập nhật khoản chi.

### Quy tắc VND

- Chỉ chấp nhận số VND nguyên, không âm.
- Từ chối danh sách thành viên trùng hoặc chứa giá trị rỗng.
- Phần dư được phân ổn định, ưu tiên người thanh toán nếu họ tham gia chia.
- Tổng mọi phần chia luôn bằng tổng khoản chi.
- Bộ `VndSplitCalculatorTest` có 15 trường hợp kiểm thử.

### AI Planner

- Có giới hạn 5 lượt/người dùng/ngày cho endpoint AI theo chuyến đi.
- Phản hồi Gemini phải đi qua `AiResponseValidator` trước khi hiển thị.
- Khi timeout, lỗi mạng, HTTP 429/5xx hoặc JSON không hợp lệ, hệ thống dùng kế
  hoạch fallback thay vì trả lỗi 500.
- Gemini client retry có giới hạn theo `vista.ai.max-retries`.
- Log không chứa response đầy đủ của nhà cung cấp AI.

## Kịch bản demo TV4

1. Đăng nhập và mở chuyến đi `Đà Nẵng – Hội An 3N2Đ`.
2. Nhập khoản ăn uống `1.250.000 VND`, chia đều cho bốn người.
3. Nhập khoản di chuyển `850.000 VND`, chỉ ba người tham gia.
4. Sửa khoản di chuyển và xác nhận hệ thống tính lại phần chia.
5. Xem tổng thực chi, ngân sách còn lại và danh sách ai cần chuyển tiền cho ai.
6. Mở VietQR cho một giao dịch quyết toán.
7. Mở AI Planner, chọn Đà Nẵng, ba ngày, ngân sách trung bình và sở thích ẩm thực.
8. Nhận gợi ý và xác nhận dữ liệu fallback vẫn xuất hiện nếu Gemini không khả dụng.

## Lệnh kiểm định

```powershell
cd backend
.\gradlew.bat spotlessCheck test --tests "com.vista.budget.*" --tests "com.vista.ai.*"

cd ..\contracts
npm run api:validate
npm run api:generate

cd ..\mobile
npm run typecheck
npm test -- --runTestsByPath `
  src/features/budget/__tests__/BudgetComponents.test.tsx `
  src/features/budget/__tests__/VietQRModal.test.tsx `
  src/features/ai-planner/__tests__/AiPlannerScreen.test.tsx
```

## Kết quả kiểm định hiện tại

- OpenAPI: hợp lệ; còn ba cảnh báo cũ không thuộc TV4.
- Generated TypeScript types: đã cập nhật cho PATCH Expense.
- Mobile TypeScript: đạt.
- Mobile TV4 tests: 11/11 đạt.
- ESLint phần TV4: không có error; còn warning mã cũ.
- Backend Gradle: chưa chạy được trong môi trường Codex hiện tại vì Gradle không
  thể tạo kết nối loopback cho single-use daemon. Cần chạy lại lệnh kiểm định
  backend trên terminal phát triển hoặc CI trước code freeze.

## Điều kiện code freeze

- Backend Budget và AI test đều pass trên CI.
- Không còn lỗi P0/P1.
- Không có secret Gemini trong Git.
- Demo thành công cả hai trường hợp Gemini hoạt động và Gemini fallback.
- Không bổ sung tính năng mới sau khi chốt build demo.
