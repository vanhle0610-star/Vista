# Kiến trúc backend

Modular monolith tổ chức theo feature. Controller chỉ xử lý HTTP/validation; application service điều phối transaction/quyền; domain chứa quy tắc; persistence chứa JPA. Module khác chỉ gọi public application interface, không truy cập repository riêng. `common` chỉ chứa security, web error, logging và cấu hình dùng chung.
