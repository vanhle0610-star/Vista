# Cơ sở dữ liệu VISTA

Flyway trong backend là nguồn duy nhất quản lý schema. Không chạy migration riêng của Supabase lên các bảng ứng dụng. File CSV mẫu chỉ mô tả cấu trúc nhập liệu; dòng ví dụ là dữ liệu tổng hợp, không phải dữ liệu địa điểm thật.

Quy tắc nhập lại dự kiến: chuẩn hóa `province + name`, kiểm tra schema và nguồn, chạy trong transaction, cập nhật bản ghi khớp slug và không xóa dữ liệu ngoài tập nhập. Importer thực tế thuộc W2-10 nên chưa được triển khai.
