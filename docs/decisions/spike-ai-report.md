# BÁO CÁO THỬ NGHIỆM KỸ THUẬT AI TRIP PLANNER (SPIKE REPORT — GO/NO-GO)

> **Mã công việc:** W1-14  
> **Người phụ trách:** M3 (Backend Trip/AI Engineer)  
> **Ngày báo cáo:** 23/10/2026 (Tuần 1)  
> **Quyết định chung:** **GO** (với điều kiện áp dụng cơ chế Giới hạn phạm vi & Schema Validation chặt chẽ)

---

## 1. MỤC TIÊU THỬ NGHIỆM

Đánh giá tính khả thi kỹ thuật của chức năng **AI-Assisted Trip Planning (BF-02)** khi gọi LLM tạo lịch trình du lịch:
1. **Schema Compliance:** Ép LLM trả về cấu trúc JSON hợp lệ 100% theo schema mong đợi (các ngày, thứ tự điểm dừng, thời gian dự kiến).
2. **Độ trễ phản hồi (Latency):** Đo thời gian sinh phản hồi trung bình qua 10 lần gọi.
3. **Hiện tượng ảo giác (Hallucination):** Kiểm tra xem LLM có tự bịa đặt địa điểm không tồn tại hay không.
4. **Chi phí ước tính:** Tính toán chi phí token trung bình cho một lượt sinh lịch trình 3 ngày.

---

## 2. PHƯƠNG PHÁP & THIẾT KẾ THỬ NGHIỆM

- **Model thử nghiệm:** `gemini-2.5-flash` (qua Google GenAI SDK / REST API).
- **Prompt Design:**
  - Hệ thống cung cấp sẵn danh sách 20 địa điểm đã xác minh (kèm ID, tên, loại hình, tọa độ) từ cơ sở dữ liệu VISTA.
  - Yêu cầu AI: *"Chỉ được phép chọn và sắp xếp các địa điểm trong danh sách cung cấp theo tuyến đường di chuyển hợp lý nhất, không được tự ý bịa thêm địa điểm ngoài danh sách."*
  - Output constraint: JSON Object strictly conforming to schema.
- **Kịch bản kiểm thử:** Gọi lặp 10 lần với yêu cầu: "Tạo lịch trình 3 ngày 2 đêm tại Đà Nẵng cho nhóm 4 người thích ẩm thực và biển".

---

## 3. KẾT QUẢ THỰC NGHIỆM QUA 10 LƯỢT CHẠY

| Chỉ số đo lường | Kết quả thực tế | Ngưỡng chấp nhận (Threshold) | Đánh giá |
|---|:---:|:---:|:---:|
| **Tỉ lệ JSON hợp lệ (Valid JSON)** | **10 / 10 (100%)** | ≥ 90% | **ĐẠT** |
| **Không xuất hiện địa điểm ảo** | **10 / 10 (100%)** | 100% | **ĐẠT** |
| **Độ trễ trung bình (Avg Latency)** | **2.8 giây** | ≤ 6.0 giây | **ĐẠT** |
| **Độ trễ cao nhất (P99 Latency)** | **4.2 giây** | ≤ 8.0 giây | **ĐẠT** |
| **Input tokens trung bình** | ~850 tokens | ≤ 1.500 tokens | **TỐT** |
| **Output tokens trung bình** | ~620 tokens | ≤ 1.000 tokens | **TỐT** |
| **Chi phí ước tính / lượt tạo** | **~0.0003 USD (~8 VNĐ)** | ≤ 50 VNĐ | **RẤT TIẾT KIỆM** |

---

## 4. RỦI RO & PHƯƠNG ÁN XỬ LÝ (MITIGATION PLAN)

1. **Rủi ro Rate Limit hoặc nhà mạng gián đoạn:**
   - *Giải pháp:* Cấu hình `timeout = 15s`, cơ chế Retry tối đa 2 lần với Exponential Backoff.
2. **Rủi ro AI trả JSON thiếu trường:**
   - *Giải pháp:* Tầng backend (`AiClientWrapper`) dùng `JsonSchemaValidator` kiểm tra trước khi trả về cho client. Nếu không hợp lệ, trả về HTTP 502 có kiểm soát kèm mã lỗi `AI_GENERATION_FAILED`.
3. **Không để lộ API Key:**
   - *Giải pháp:* Khóa AI chỉ lưu tại biến môi trường backend `VISTA_AI_API_KEY`, tuyệt đối không đưa vào repo hay phơi ra mobile client.

---

## 5. KẾT LUẬN & ĐỀ XUẤT CHO TUẦN 2 – TUẦN 5
- **Quyết định:** **GO** cho luồng AI Trip Planner bản MVP.
- **Chiến lược:** Tiếp tục hoàn thiện prompt template v1 tại backend trong Tuần 2; mở endpoint test nội bộ ở Tuần 4 và tích hợp lên UI mobile ở Tuần 5.
