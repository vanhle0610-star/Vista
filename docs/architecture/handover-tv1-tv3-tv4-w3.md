# TÀI LIỆU BÀN GIAO INTERFACE DESTINATION QUERY SERVICE (HANDOVER TO TV3 & TV4 — TUẦN 3)

> **Người bàn giao:** TV1 (Guest / Visitor — Destination Discovery & Mobile Lead)  
> **Người nhận bàn giao:**  
> - **TV3:** Invited User / Trip Member — Itinerary & Real-time Collaboration Lead  
> - **TV4:** Budget & AI Planner Lead  
> **Thời điểm bàn giao:** Tuần 3 (W3)  
> **Dự án:** VISTA — Vietnam Smart Travel Platform  
> **Vị trí hợp đồng:** `backend/src/main/java/com/vista/destination/application/DestinationQueryService.java`  

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC RÀNG BUỘC KIẾN TRÚC

Theo tài liệu [Actor-Driven Module Boundaries](file:///docs/architecture/module-boundaries.md):
1. **Tuyệt đối không gọi chéo Persistence Layer:** TV3 (`com.vista.itinerary`) và TV4 (`com.vista.ai`, `com.vista.budget`) **không** inject `DestinationRepository` hoặc tham chiếu trực tiếp JPA entity `DestinationEntity`.
2. **Giao tiếp hoàn toàn qua Public Contract:** Toàn bộ truy vấn thông tin điểm đến phục vụ thêm điểm dừng vào lịch trình (`itinerary_items`), tính toán ngân sách vé, hoặc AI sinh lịch trình phải đi qua interface `DestinationQueryService`.
3. **Độc lập và Testable:** Interface đi kèm bản triển khai chính `DestinationService` (truy vấn DB qua JPA) và bản giả lập nhẹ `StubDestinationQueryService` (phục vụ unit test của TV3/TV4 mà không cần khởi động Spring context hay database).

---

## 2. CHI TIẾT HỢP ĐỒNG (INTERFACE CONTRACT)

### 2.1. Interface Definition

Package: `com.vista.destination.application`

```java
package com.vista.destination.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DestinationQueryService {

    /**
     * Tra cứu thông tin điểm đến đã được duyệt và công bố (PUBLISHED).
     * @param id ID của điểm đến
     * @return Optional chứa DestinationSummary nếu tồn tại và có status PUBLISHED; Optional.empty() nếu không tồn tại hoặc chưa công bố.
     */
    Optional<DestinationSummary> findPublishedById(UUID id);

    /**
     * Tra cứu hàng loạt điểm đến đã công bố theo danh sách ID (dùng cho tải lịch trình nhiều điểm dừng).
     * @param ids Danh sách các ID điểm đến
     * @return Danh sách các DestinationSummary hợp lệ và PUBLISHED. Tự động bỏ qua các ID không hợp lệ hoặc chưa công bố.
     */
    List<DestinationSummary> findPublishedByIds(List<UUID> ids);

    /**
     * Tìm kiếm và lọc danh sách điểm đến đã công bố phục vụ AI gợi ý hoặc tìm kiếm thêm vào lịch trình.
     * @param keyword Từ khóa tìm kiếm theo tên hoặc địa chỉ (nếu null/rỗng sẽ bỏ qua)
     * @param province Tên tỉnh/thành (ví dụ: 'Đà Nẵng', 'Hà Nội', 'Ninh Bình'; nếu null/rỗng sẽ bỏ qua)
     * @param category Tên danh mục (ví dụ: 'Di sản & Lịch sử', 'Ẩm thực'; nếu null/rỗng sẽ bỏ qua)
     * @param limit Số lượng tối đa trả về (mặc định tối thiểu 1, tối đa 50)
     * @return Danh sách các DestinationSummary thỏa mãn điều kiện
     */
    List<DestinationSummary> searchPublished(String keyword, String province, String category, int limit);

    /**
     * Kiểm tra nhanh trạng thái một điểm đến có đang PUBLISHED hay không.
     * @param id ID của điểm đến
     * @return true nếu điểm đến tồn tại và đang ở trạng thái PUBLISHED; ngược lại false.
     */
    boolean isPublished(UUID id);
}
```

---

### 2.2. Data Transfer Object (`DestinationSummary`)

Package: `com.vista.destination.application`

```java
public record DestinationSummary(
    UUID id,
    String name,
    String provinceName,
    String categoryName,
    BigDecimal priceMin,          // Bổ sung W3: Phục vụ TV4 tính toán ngân sách
    BigDecimal priceMax,          // Bổ sung W3: Phục vụ TV4 tính toán ngân sách
    Double latitude,
    Double longitude,
    String imageUrl,
    String openingHours           // Bổ sung W3: JSON cấu trúc 7 ngày phục vụ TV4 xếp lịch
) {
    // Có các constructor phụ hỗ trợ tương thích ngược (8, 9 hoặc 10 tham số)
}
```

#### Quy ước dữ liệu trường đặc biệt:
- **`priceMin` & `priceMax`:**
  - Nếu điểm đến miễn phí: `0` và `0`.
  - Nếu giá cố định: `priceMin == priceMax` (ví dụ `150000`).
  - Nếu khoảng giá: `priceMin < priceMax` (ví dụ `900000` và `1250000`).
  - Nếu chưa có thông tin xác minh: `null` (TV4 không nên cộng 0đ vào tổng dự toán nếu giá trị là `null`).
- **`openingHoursJson`:**
  - Định dạng chuẩn JSON 7 ngày: `{"mon":"07:30-17:00","tue":"07:30-17:00",...,"sun":"closed"}`.
  - Hỗ trợ cả `"00:00-23:59"` cho điểm đến mở cửa 24/7.
  - Giúp TV4 thẩm định xem khung giờ gợi ý cho khách (`ItineraryItem.startTime - endTime`) có rơi vào lúc điểm đến đóng cửa hay không.

---

## 3. QUY TẮC NGHIỆP VỤ PUBLISHED (BUSINESS RULES)

1. **Chỉ trả về trạng thái `PUBLISHED`:**
   - Mọi phương thức truy vấn qua `DestinationQueryService` đều áp dụng bộ lọc `status = 'PUBLISHED'`.
   - Nếu điểm đến ở trạng thái `DRAFT`, `PENDING_REVIEW`, `SUSPENDED`, `ARCHIVED` hoặc đã bị xóa mềm, `findPublishedById` sẽ trả về `Optional.empty()` và `isPublished` trả về `false`.
2. **Bảo vệ toàn vẹn lịch trình (Itinerary Integrity):**
   - TV3 **bắt buộc** gọi `destinationQueryService.isPublished(destinationId)` hoặc `findPublishedById(destinationId)` trước khi cho phép lưu một `ItineraryItem` mới. Nếu trả về `false`/`empty`, bắn ngoại lệ nghiệp vụ `DestinationNotAvailableException` hoặc `400 Bad Request`.
3. **Khả năng chịu lỗi hàng loạt (Batch Resilience):**
   - Phương thức `findPublishedByIds(ids)` tự động loại bỏ các ID không tồn tại hoặc bị gỡ bỏ, không làm gián đoạn việc tải toàn bộ ngày lịch trình của người dùng.

---

## 4. HƯỚNG DẪN TÍCH HỢP CHO TV3 (ITINERARY MODULE)

### 4.1. Inject Service vào Itinerary Service
```java
@Service
public class ItineraryService {

    private final DestinationQueryService destinationQueryService;
    private final ItineraryItemRepository itineraryItemRepository;

    public ItineraryService(
            DestinationQueryService destinationQueryService,
            ItineraryItemRepository itineraryItemRepository) {
        this.destinationQueryService = destinationQueryService;
        this.itineraryItemRepository = itineraryItemRepository;
    }

    @Transactional
    public ItineraryItemDto addStop(UUID tripId, UUID dayId, AddStopCommand cmd) {
        // 1. Thẩm định điểm đến phải hợp lệ và PUBLISHED
        DestinationSummary dest = destinationQueryService.findPublishedById(cmd.destinationId())
                .orElseThrow(() -> new IllegalArgumentException("Địa điểm không tồn tại hoặc chưa được công bố: " + cmd.destinationId()));

        // 2. Tạo điểm dừng lưu thông tin snapshot
        ItineraryItem item = new ItineraryItem();
        item.setDayId(dayId);
        item.setDestinationId(dest.id());
        item.setTitle(dest.name());
        item.setStartTime(cmd.startTime());
        item.setEndTime(cmd.endTime());
        // ...
        return itineraryItemRepository.save(item);
    }
}
```

### 4.2. Tải thông tin hiển thị cho danh sách điểm dừng
```java
public List<TripStopCardDto> getDayStops(UUID dayId) {
    List<ItineraryItem> items = itineraryItemRepository.findByDayIdOrderByStartTime(dayId);
    Set<UUID> destIds = items.stream().map(ItineraryItem::getDestinationId).collect(Collectors.toSet());
    
    // Batch query tối ưu N+1
    Map<UUID, DestinationSummary> destMap = destinationQueryService.findPublishedByIds(destIds)
            .stream()
            .collect(Collectors.toMap(DestinationSummary::id, Function.identity()));

    return items.stream().map(item -> {
        DestinationSummary summary = destMap.get(item.getDestinationId());
        return new TripStopCardDto(
            item.getId(),
            summary != null ? summary.name() : item.getTitle(),
            summary != null ? summary.imageUrl() : null,
            item.getStartTime(),
            item.getEndTime()
        );
    }).toList();
}
```

---

## 5. HƯỚNG DẪN TÍCH HỢP CHO TV4 (AI PLANNER & BUDGET)

### 5.1. Thu thập danh sách địa điểm thật làm Context cho Gemini Prompt
```java
@Service
public class AiTripPlannerService {

    private final DestinationQueryService destinationQueryService;
    private final GeminiAiClient geminiAiClient;

    public AiTripPlanResponse generatePlan(AiTripPlanRequest request) {
        // 1. Lấy danh sách điểm đến thật theo tỉnh/thành người dùng muốn đi
        List<DestinationSummary> candidates = destinationQueryService.searchPublished(
            null, 
            request.provinceCode(), 
            request.categoryPreference(), 
            30
        );

        // 2. Format JSON hoặc prompt text gửi cho Gemini AI
        String prompt = buildPromptWithRealDestinations(request, candidates);
        
        // 3. Gọi Gemini và phân tích JSON kết quả
        return geminiAiClient.generatePlan(prompt);
    }
}
```

### 5.2. Tính toán chi phí dự trù điểm tham quan (Budget Estimator)
```java
@Service
public class BudgetEstimationService {

    private final DestinationQueryService destinationQueryService;

    public EstimatedAttractionCost estimateCosts(Collection<UUID> plannedDestinationIds) {
        List<DestinationSummary> destinations = destinationQueryService.findPublishedByIds(plannedDestinationIds);

        BigDecimal minTotal = BigDecimal.ZERO;
        BigDecimal maxTotal = BigDecimal.ZERO;
        int unknownPriceCount = 0;

        for (DestinationSummary d : destinations) {
            if (d.priceMin() != null && d.priceMax() != null) {
                minTotal = minTotal.add(d.priceMin());
                maxTotal = maxTotal.add(d.priceMax());
            } else {
                unknownPriceCount++;
            }
        }

        return new EstimatedAttractionCost(minTotal, maxTotal, unknownPriceCount);
    }
}
```

---

## 6. HƯỚNG DẪN VIẾT TEST KHÔNG CẦN CHẠY DATABASE (STUB USAGE)

Trong unit test của TV3 hoặc TV4, có thể khởi tạo trực tiếp `StubDestinationQueryService`:

```java
class ItineraryServiceTest {

    private StubDestinationQueryService stubDestinationQueryService;
    private ItineraryService itineraryService;

    @BeforeEach
    void setUp() {
        stubDestinationQueryService = new StubDestinationQueryService();
        itineraryService = new ItineraryService(stubDestinationQueryService, mockRepo);
    }

    @Test
    void shouldAddStopWhenDestinationIsPublished() {
        // Dùng destination mẫu ID 11111111-1111-1111-1111-111111111111 có sẵn trong stub
        UUID destId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        
        // Hoặc nạp thêm điểm test linh hoạt
        stubDestinationQueryService.addDestination(new DestinationSummary(
            UUID.randomUUID(), "Cầu Rồng", "cau-rong", "DAN", "Đà Nẵng",
            "CULTURE", "Văn hóa", new BigDecimal("16.061"), new BigDecimal("108.227"),
            "Đà Nẵng", null, BigDecimal.ZERO, BigDecimal.ZERO, "{}"
        ));

        // Test logic nghiệp vụ của TV3/TV4
    }
}
```

---

## 7. TRẠNG THÁI KIỂM ĐỊNH TẠI TUẦN 3

- [x] Interface `DestinationQueryService` và DTO `DestinationSummary` đã hoàn thiện.
- [x] Triển khai JPA thực tế trong `DestinationService` hỗ trợ cả 4 phương thức.
- [x] Triển khai `StubDestinationQueryService` hỗ trợ in-memory testing.
- [x] Bộ unit test `DestinationQueryServiceTest` đã chạy thành công 100% (4/4 test cases pass) chứng minh TV3/TV4 có thể dùng an toàn.
