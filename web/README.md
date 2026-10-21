# VISTA Web Portal & Management

Ứng dụng web toàn diện của nền tảng VISTA (Next.js 16 App Router, React 19, TypeScript), phục vụ hai đối tượng chính:

1. **Du khách & Người dùng du lịch (Public Web Portal):**
   - **Trang chủ (`/`):** Khám phá điểm đến nổi bật tại Việt Nam (Đà Nẵng, Hà Nội, Huế, Hội An, TP.HCM), giới thiệu tính năng AI Trip Planner, An toàn và Thủ quỹ nhóm.
   - **Xác thực (`/login`):** Đăng nhập Google một chạm, đăng ký số điện thoại quốc tế với hỗ trợ 10 ngôn ngữ và khung cảnh Việt Nam sinh động.
   - **Thủ quỹ chuyến đi (`/trips/[tripId]/treasury`):** Bảng quản lý chi tiêu nhóm, phân loại ngân sách, biểu đồ phân tích và ma trận hoàn tiền "Ai nợ Ai" tự động.

2. **Khu vực Quản trị & Điều hành (`/dashboard`, `/destinations`, `/users`, `/moderation`):**
   - Dành riêng cho vai trò ADMIN và MODERATOR.
   - Quản lý điểm đến (CMS), người dùng, hàng đợi kiểm duyệt bài viết và giám sát trạng thái backend theo thời gian thực.

## Khởi động phát triển

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm.
