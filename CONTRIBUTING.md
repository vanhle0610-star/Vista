# HƯỚNG DẪN ĐÓNG GÓP CHO DỰ ÁN VISTA (CONTRIBUTING)

Chào mừng bạn tham gia phát triển nền tảng **VISTA — Vietnam Smart Travel Platform**!

---

## 📜 QUY CHUẨN LẬP TRÌNH BẮT BUỘC (QUAN TRỌNG NHẤT)

Để đảm bảo cả 5 thành viên trong đội ngũ code đồng nhất 100%, không xung đột mã nguồn và không phá vỡ kiến trúc hệ thống, **mọi thành viên bắt buộc phải đọc kỹ và tuân thủ tài liệu**:

👉 **[TEAM_CODING_RULES.md](file:///c:/Users/Lenovo%20LEGION%205/OneDrive/Desktop/VISTA/TEAM_CODING_RULES.md)**

Trong đó quy định chi tiết:
1. **Checklist 5 bước bắt buộc trước khi gõ code (Pre-Coding Checklist)**.
2. **Quy chuẩn kiến trúc Backend (Spring Boot Modular Monolith)**.
3. **Quy chuẩn cấu trúc Mobile (Expo Router & TanStack Query)**.
4. **Quy tắc cơ sở dữ liệu & Flyway Migrations**.
5. **Quy chuẩn commit (Conventional Commits) & Tiêu chuẩn nghiệm thu PR (Definition of Done)**.
6. **Ma trận phân vùng trách nhiệm file giữa 5 thành viên (M1 - M5)**.

---

## 🚀 QUY TRÌNH TẠO NHÁNH & PULL REQUEST

1. **Nhánh gốc:** Luôn kéo code mới nhất từ nhánh `develop` trước khi tạo nhánh mới:
   ```powershell
   git checkout develop
   git pull origin develop
   ```
2. **Đặt tên nhánh:**
   - Tính năng mới: `feature/W<tuần>-<mã_task>-<tên_ngắn>` (VD: `feature/W2-06-auth-login`).
   - Sửa lỗi: `fix/W<tuần>-<mã_task>-<tên_ngắn>` (VD: `fix/W2-15-token-refresh`).
3. **Mở Pull Request:**
   - Luôn hướng PR vào nhánh `develop`.
   - Sử dụng đúng mẫu PR Template và đính kèm bằng chứng kiểm thử (log/ảnh chụp).
   - Chỉ được merge khi toàn bộ GitHub Actions CI đạt màu xanh và có ít nhất 1 phê duyệt từ người phụ trách module theo `CODEOWNERS`.
