# Kiến trúc mobile

`src/app` chỉ định tuyến. Logic nằm trong `src/features`; server state dùng TanStack Query; form dùng React Hook Form + Zod; token thật sẽ lưu SecureStore từ W2. `EXPO_PUBLIC_API_URL` phải là địa chỉ LAN của máy khi chạy trên điện thoại thật, không phải localhost.
