# ADR 004 Flyway và tinh chỉnh ERD

Flyway là nguồn schema duy nhất. Baseline thêm `destination_proposals`, `emergency_contact`, `budget_share`, `opening_hours` JSONB và version cho collaborative edits theo kế hoạch W1-13. PostGIS chưa bật vì provider/truy vấn địa lý chưa chốt; tọa độ dùng NUMERIC. Không lưu lịch sử GPS đầy đủ. Mọi thay đổi sau baseline phải là migration mới.
