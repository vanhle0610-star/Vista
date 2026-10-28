# Báo cáo triển khai nền tảng AI tự host VISTA — 27/10/2026

## Đã hoàn thành

- Thay kế hoạch tuyệt đối hóa “0 hallucination” bằng mục tiêu có thể kiểm chứng: dữ liệu chưa qua
  backend validation không được trả hoặc lưu.
- Thêm `AiProvider`, `OpenAiCompatibleProvider`, `GeminiProvider` và `AiProviderRouter`.
- Mặc định hệ thống ở `LOCAL_ONLY`; Gemini chỉ được dùng trong `GEMINI_ONLY` hoặc
  `LOCAL_WITH_APPROVED_GEMINI_FALLBACK`.
- API AI theo chuyến đi chỉ đưa destination PUBLISHED vào catalogue và bắt model trả
  `destinationId`.
- API quick-plan công khai cũng đi qua provider router và cùng allowlist PUBLISHED.
- ID không nằm trong allowlist bị loại; tên, danh mục và giá được ghi đè từ dữ liệu backend.
- Fallback theo chuyến đi không còn tạo UUID và địa danh giả; nó chỉ sắp xếp ứng viên PUBLISHED.
- Thêm migration RAG dùng BGE-M3 1024 chiều, content hash, source revision, embedding version,
  full-text index, metadata index và HNSW.
- Chuyển PostgreSQL local/test migration sang image có pgvector.
- Thêm profile Ollama trong Docker Compose; model server chỉ bind loopback.
- Thêm unit test chứng minh `LOCAL_ONLY` không gọi Gemini và approved fallback được ghi nhận.

## Cấu hình chạy local

```powershell
docker compose --profile local-ai up -d postgres ollama
docker compose exec ollama ollama pull qwen3:4b
```

Các biến quan trọng:

```text
AI_LOCAL_BASE_URL=http://localhost:11434/v1
AI_LOCAL_MODEL=qwen3:4b
AI_FALLBACK_MODE=LOCAL_ONLY
```

Không đặt `LOCAL_WITH_APPROVED_GEMINI_FALLBACK` nếu chưa được phép gửi dữ liệu ra dịch vụ ngoài.

## Xác minh

- `git diff --check`: đạt, không có whitespace error.
- Gradle chưa thể khởi chạy task trên máy hiện tại vì client không tạo được loopback connection
  tới single-use daemon (`java.io.IOException: Unable to establish loopback connection`). Lỗi xảy
  ra trước bước compile/test và vẫn tái hiện khi tắt daemon/JVM args; file cấu hình Gradle đã được
  khôi phục nguyên trạng.
- Chưa chạy evaluation model thật vì model Ollama chưa được tải trong môi trường hiện tại.

## Phần chưa được tuyên bố hoàn thành

- Ingestion/embedding job cho toàn bộ dữ liệu địa điểm.
- Hybrid search/RRF service và reranker.
- One-shot schema repair có giới hạn.
- Job bất đồng bộ/SSE cho inference dài.
- Evaluation 100–200 ca trên model thật và benchmark GPU.
- Các template fallback cũ trong `AiQuickPlanController` không còn nằm trên execution path và nên
  được xóa ở lượt dọn code kế tiếp sau khi regression test chạy được.

Các phần trên phụ thuộc model runtime, database pgvector chạy thật và một vòng triển khai tiếp theo;
không được ghi nhận là production-ready chỉ dựa trên code nền hiện tại.
