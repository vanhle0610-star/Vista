# Kế hoạch triển khai AI VISTA có thể nghiệm thu

## Mục tiêu có thể kiểm chứng

VISTA không cam kết mô hình không bao giờ tạo nội dung sai. Hệ thống cam kết không trả hoặc lưu
dữ liệu địa điểm chưa được backend kiểm chứng. PostgreSQL và các service nghiệp vụ là nguồn sự
thật; LLM chỉ chọn ứng viên và sắp xếp lịch trình.

## Phạm vi production-like MVP

1. Provider abstraction hỗ trợ local OpenAI-compatible và Gemini.
2. Mặc định `LOCAL_ONLY`; chỉ gửi dữ liệu ra Gemini khi cấu hình chủ động cho phép.
3. RAG chỉ truy xuất địa điểm `PUBLISHED`, có version model embedding và content hash.
4. Structured output bắt buộc chứa `destinationId` thuộc tập ứng viên backend cung cấp.
5. Spring Boot xác minh ID, tên, trạng thái và tính lại chi phí từ dữ liệu nội bộ.
6. Unit test chạy mỗi commit; integration/evaluation/load test chạy thành các suite riêng.

## Tiêu chí nghiệm thu

| Chỉ số | Ngưỡng |
|---|---:|
| Destination ID không hợp lệ đến được client | 0 |
| Cross-trip leakage | 0 |
| JSON hợp lệ ngay lần đầu | đo baseline, mục tiêu >= 95% |
| JSON hợp lệ sau tối đa một repair | >= 99% |
| Tổng tiền khớp dữ liệu giá và quy tắc tại thời điểm tính | 100% |
| Provider thực tế và việc fallback xuất hiện trong telemetry | 100% |

`BigDecimal` bảo đảm phép tính nhất quán, không bảo đảm giá thị trường đúng. Response và báo cáo
phải phân biệt giá tính từ dữ liệu hiện có với giá ước lượng, đồng thời ghi thời điểm/nguồn giá.

## Lộ trình

### Giai đoạn 0 — Baseline

- Khóa 100–200 case tiếng Việt có kết quả mong đợi hoặc rubric.
- Đo Gemini hiện tại: schema, grounded IDs, latency và tỷ lệ thành công.

### Giai đoạn 1 — Provider boundary

- `AiProvider`, local provider và Gemini provider.
- Ba chế độ: `LOCAL_ONLY`, `LOCAL_WITH_APPROVED_GEMINI_FALLBACK`, `GEMINI_ONLY`.
- Không fallback âm thầm.

### Giai đoạn 2 — Model benchmark

- Benchmark Qwen3 4B và 8B trên đúng máy demo.
- Khóa repository, revision/checksum, quantization, runtime và chat template.
- Chỉ chọn model sau khi có số liệu chất lượng, VRAM, TTFT, token/s và P95.

### Giai đoạn 3 — RAG

- BGE-M3 dùng vector 1024 chiều.
- Migration RAG nằm trong `classpath:db/ai-migration` và chỉ được bật sau khi xác nhận PostgreSQL
  có pgvector bằng `FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/ai-migration`.
- Ingestion idempotent theo `content_hash`; unpublish phải loại khỏi retrieval.
- Hybrid search và metadata filtering diễn ra trước khi đưa context cho model.

### Giai đoạn 4 — Guardrails

- Parse/schema validation, sau đó mới business validation.
- One-shot repair chỉ sửa cấu trúc; không tự thêm ID, giá hoặc dữ liệu nghiệp vụ.
- Không có ứng viên hợp lệ thì trả lỗi rõ ràng, không sinh địa danh giả.

### Giai đoạn 5 — Evaluation và vận hành

- Unit/contract test trên mọi commit.
- Integration test với PostgreSQL/pgvector thật.
- AI evaluation chạy nightly hoặc trước release trên máy có model.
- Load/OOM/recovery test chạy riêng theo cấu hình phần cứng được ghi nhận.

## Những phần hoãn cho tới khi có tải thật

- Kubernetes, multi-GPU, high availability và distributed vLLM.
- Fine-tuning/LoRA trước khi RAG và prompt đã đạt baseline.
- Dữ liệu thời tiết thời gian thực trong chế độ offline.
