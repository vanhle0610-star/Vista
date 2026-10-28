# Local AI và RAG runbook

## Điều kiện

- Docker Desktop và Docker Compose hoạt động.
- Java 21 và Node.js theo `.nvmrc`.
- Ít nhất 12 GB RAM trống; GPU là tùy chọn.

Kiểm tra nhanh runtime mà không hiển thị secret:

```powershell
.\scripts\check-ai-runtime.ps1
```

## Khởi động runtime

```powershell
$env:DB_PASSWORD='vista-local-password'
docker compose --profile local-ai up -d postgres ollama
docker compose exec ollama ollama pull qwen3:4b
docker compose exec ollama ollama pull bge-m3
```

Backend dùng các biến:

```text
AI_FALLBACK_MODE=LOCAL_ONLY
AI_LOCAL_MODEL=qwen3:4b
AI_LOCAL_BASE_URL=http://localhost:11434/v1
AI_RAG_ENABLED=true
AI_EMBEDDING_BASE_URL=http://localhost:11434
AI_EMBEDDING_MODEL=bge-m3
FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/ai-migration
```

## Tạo chỉ mục

Đăng nhập bằng tài khoản `ADMIN` hoặc `MODERATOR`, sau đó gọi:

```http
POST /api/v1/admin/ai/rag/reindex?limit=500
Authorization: Bearer <token>
```

Gọi lần thứ hai phải trả phần lớn bản ghi trong `skipped`; không được tạo chunk trùng.

## Benchmark E2E

```powershell
.\scripts\benchmark-local-ai.ps1 `
  -TripId '<trip-uuid>' `
  -AccessToken '<jwt>' `
  -Runs 10
```

Exit code `0` nghĩa là mọi lượt dùng provider `local`, không fallback. Kết quả CSV nằm trong
`artifacts/ai/`.

## Metrics

Actuator cung cấp các meter sau tại `/actuator/metrics` (endpoint yêu cầu xác thực):

- `vista.ai.provider.requests`: số request theo `provider`, `outcome`, `fallback`.
- `vista.ai.provider.latency`: histogram latency provider để tính percentile ở monitoring backend.
- `vista.ai.rag.retrieval.latency`: thời gian embedding và hybrid retrieval.
- `vista.ai.rag.hits`: số kết quả retrieval.
- `vista.ai.rag.empty`: số truy vấn RAG không có kết quả.

Không metric nào dùng user ID, Trip ID, prompt hoặc nội dung phản hồi làm tag.

## Chấp nhận gợi ý vào lịch trình chính thức

Planner gọi endpoint sau khi người dùng bấm lưu trên một Trip có UUID thật:

```http
POST /api/v1/trips/{tripId}/itinerary/merge
Authorization: Bearer <token>
```

Endpoint merge theo `dayNumber` và `sortOrder`. Nó thêm hoặc cập nhật các hoạt động trong request,
không xóa ngày hoặc hoạt động không được gửi lên. `destinationId` chỉ được chấp nhận khi địa điểm
đang `PUBLISHED`; hoạt động offline được lưu bằng `customStopName`. Mỗi item ghi nguồn
`AI_LOCAL`, `AI_GEMINI`, `AI_OFFLINE` hoặc `MANUAL`.

## Tắt RAG an toàn

Đặt `AI_RAG_ENABLED=false` và khởi động lại backend. Không cần xóa bảng hoặc vector. Provider AI
vẫn dùng catalogue PUBLISHED như trước.
