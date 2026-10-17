# Chiến lược kiểm thử

Backend có web slice test và Testcontainers migration/startup test; Docker là điều kiện cho integration test. Mobile kiểm tra schema và sẽ bổ sung component tests khi renderer tương thích SDK 57 được xác nhận. Admin dùng typecheck/lint/build ở nền tảng Week 1; test route/auth thực đi cùng auth thật. E2E trên thiết bị, GPS/map và Supabase demo chưa thể chạy trong môi trường này.
