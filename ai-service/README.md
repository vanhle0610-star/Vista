# VISTA Python LLM Microservice 🤖🇻🇳

Microservice Python siêu nhẹ, độc lập, chuyên trách:
1. **Loại bỏ gánh nặng RAG local nặng nề** (không cần cài đặt Ollama, pgvector hay chạy các model embedding ngốn RAM/CPU cục bộ trên Spring Boot).
2. **Xử lý LLM và trả lời câu hỏi dựa trên dữ liệu** du lịch có thật tại Việt Nam của VISTA.
3. **Giọng điệu hài hước, dí dỏm, tấu hài văn minh** mang lại trải nghiệm sống động cho du khách.

---

## 🛠️ Cài đặt & Khởi chạy nhanh

### 1. Cài đặt thư viện cần thiết
```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Khởi chạy Server FastAPI
```bash
python run.py
```
Hoặc dùng uvicorn trực tiếp:
```bash
uvicorn main:app --reload --port 8000
```

Dịch vụ sẽ chạy tại: `http://localhost:8000`
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

## 📡 Các API chính

### 1. `POST /api/v1/chat`
Trả lời câu hỏi của người dùng dựa trên dữ liệu điểm đến và ngữ cảnh thực tế:
```json
{
  "question": "Ở Huế ăn trưa món gì ngon và ăn chè ở đâu chuẩn vị?",
  "province": "Thừa Thiên Huế"
}
```
**Phản hồi:**
- `answer`: Câu trả lời dí dỏm, chân thực, đính kèm giá cả chuẩn (chè 12k–20k, bún bò, cơm hến).
- `grounded_destinations`: Danh sách các địa danh có thật được đối chiếu trong dữ liệu VISTA.

### 2. `POST /api/v1/recommend`
Tìm kiếm và gợi ý các điểm đến theo tỉnh thành và từ khóa mong muốn.

### 3. `POST /api/v1/plan`
Tạo lịch trình du lịch dựa trên dữ liệu điểm đến có thật.

---

## ⚙️ Cấu hình môi trường (`.env`)
Xem file `.env.example`:
- `LLM_BASE_URL`: URL API tương thích OpenAI / Claude / Gemini
- `LLM_API_KEY`: API Key được cung cấp
- `LLM_MODEL`: Mô hình LLM được sử dụng (`fulldichvu/opus-4.8` hoặc model bạn muốn)
- `INTERNAL_TOKEN`: Mã bảo mật nội bộ trao đổi giữa VISTA backend và ai-service

> [!WARNING]
> **Lưu ý bảo mật về nhà cung cấp upstream LLM (`LLM_BASE_URL`):**
> Khi cấu hình endpoint proxy của bên thứ ba không phải nhà cung cấp chính thức (OpenAI/Anthropic/Google), vui lòng lưu ý rằng các prompt chứa ngữ cảnh du lịch có thể được chuyển tiếp qua máy chủ trung gian. Tuyệt đối không gửi thông tin định danh cá nhân (PII), thông tin thẻ hay bí mật hệ thống qua kênh LLM. Trong môi trường production, khuyến nghị sử dụng endpoint chính thức hoặc self-hosted gateway an toàn.

