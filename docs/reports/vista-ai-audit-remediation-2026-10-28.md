# Báo cáo khắc phục kiểm toán AI VISTA — 28/10/2026

## Phạm vi đã xử lý

| Phát hiện | Trạng thái | Thay đổi |
|---|---|---|
| P0-1 — 4 test AI lỗi | Đã sửa code/test | Stub tên Gemini, bổ sung mock `DestinationQueryService`, cập nhật fixture JSON theo validator mới. |
| P0-2 — pgvector chặn startup | Đã giảm rủi ro | Chuyển DDL sang `db/ai-migration`; mặc định Flyway chỉ chạy migration lõi. |
| P1-2 — `provider` xung đột `fallbackMode` | Đã sửa | Xóa thuộc tính `provider`; `fallbackMode` là nguồn cấu hình duy nhất. |
| P2-1 — validator bề mặt | Đã sửa | Kiểm tra số ngày, ngày, activity, UUID, time slot, chi phí không âm và giới hạn phần tử. |
| P2-2 — ngày rỗng | Đã sửa | Chỉ thêm ngày khi còn ít nhất một activity grounded. |
| P2-3 — thiếu telemetry client | Đã sửa | Response có `provider` và `fallbackUsed`. |
| P3-1 — hơn 400 dòng fallback giả | Đã sửa | Xóa hoàn toàn phương thức và mọi `UUID.randomUUID()` khỏi package AI production. |

## Migration RAG tùy chọn

Mặc định:

```text
FLYWAY_LOCATIONS=classpath:db/migration
```

Sau khi xác nhận PostgreSQL có pgvector:

```text
FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/ai-migration
```

Migration RAG được đổi sang phiên bản `V202611121000`, sau migration mới nhất hiện có, nên không
còn phụ thuộc `out-of-order` để chen migration AI vào lịch sử cũ.

## Xác minh trong lượt sửa

- `git diff --check`: không phát hiện whitespace error.
- Không còn `generateFallbackResponse` hoặc `UUID.randomUUID()` trong Java production package AI.
- Gradle trong phiên Codex hiện tại vẫn dừng trước task vì không tạo được loopback connection tới
  daemon. Do đó trạng thái 32 test phải được chạy lại trên terminal host đã từng thực hiện kiểm toán;
  báo cáo này không tự nhận test xanh khi chưa có output mới.

## Chưa hoàn thành

Các hạng mục RAG runtime vẫn giữ nguyên trạng thái chưa hoàn thành: ingestion, embedding BGE-M3,
vector/FTS query, RRF, citations, reranking và evaluation model thật. Các phần này là giai đoạn triển
khai tiếp theo, không nằm trong tuyên bố khắc phục P0–P3 của lượt này.
