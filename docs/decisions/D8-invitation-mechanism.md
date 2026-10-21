# QUYẾT ĐỊNH KIẾN TRÚC D8: CƠ CHẾ MỜI THÀNH VIÊN VÀ THÔNG BÁO

> **Mã quyết định:** D8  
> **Người đề xuất:** TV3 (Invited User / Trip Member)  
> **Trạng thái:** ĐÃ PHÊ DUYỆT (Tuần 1)  
> **Bên liên quan:** TV1 (Mobile App Deep Link), TV2 (Trip Owner / RBAC)

---

## 1. BỐI CẢNH & VẤN ĐỀ
Trong chuyến đi nhóm, việc kết nối bạn bè cần đảm bảo:
- Nhanh chóng, không phụ thuộc vào việc hệ thống email server gửi mail chậm hoặc vào hòm thư rác (Spam).
- Người dùng có thể chia sẻ trực tiếp qua Zalo, Messenger, Telegram hoặc quét mã trực tiếp khi đang gặp mặt.

---

## 2. NỘI DUNG QUYẾT ĐỊNH (D8)
1. **Ưu tiên triển khai trước (Week 1 - Week 3):**
   - **Liên kết mời trực tiếp (Deep Link):** `https://vista.vn/join/{token}` mở thẳng màn hình chấp nhận tham gia trên ứng dụng Mobile.
   - **Mã mời rút gọn (Invite Code):** Chuỗi 6-8 ký tự (hoặc token hex) dễ đọc và nhập tay.
2. **Triển khai bổ sung (Week 5 - Week 6):**
   - Gửi email mời qua SMTP / Resend / Supabase Auth Mailer khi người dùng có nhu cầu gửi thư chính thức.
3. **Cơ chế thông báo (NotificationService):**
   - Tuần 1: Cung cấp `StubNotificationService` in-memory log để TV2, TV4, TV5 gọi an toàn mà không bị crash.
   - Tuần 6: Nâng cấp `NotificationService` bản thật lưu CSDL bảng `notifications` và tích hợp Firebase Cloud Messaging (FCM) / Expo Push Notification qua bảng `device_tokens`.

