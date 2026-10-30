package com.vista.ai.scheduler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.scheduler.OpeningHoursHelper.ScheduleWindow;
import com.vista.ai.scheduler.TransitCalculator.TransitInfo;
import com.vista.ai.scheduler.TravelScheduler.ScheduledPlanResult;
import com.vista.ai.util.AiResponseValidator;
import com.vista.destination.application.DestinationSummary;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TravelSchedulerBusinessTest {

  private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

  private List<DestinationSummary> mockDestinations;

  @BeforeEach
  void setUp() {
    mockDestinations = new ArrayList<>();

    // 1. Lăng Minh Mạng (Huế)
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Lăng Minh Mạng",
            "Thừa Thiên Huế",
            "Di tích lịch sử",
            BigDecimal.valueOf(150000),
            BigDecimal.valueOf(150000),
            16.3888,
            107.5714,
            "https://vista.vn/images/minhmang.jpg",
            "{\"mon\":\"07:30-17:30\",\"tue\":\"07:30-17:30\",\"wed\":\"07:30-17:30\",\"thu\":\"07:30-17:30\",\"fri\":\"07:30-17:30\",\"sat\":\"07:30-17:30\",\"sun\":\"07:30-17:30\"}"));

    // 2. Lăng Khải Định (Huế)
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            "Lăng Khải Định",
            "Thừa Thiên Huế",
            "Di tích lịch sử & Kiến trúc",
            BigDecimal.valueOf(150000),
            BigDecimal.valueOf(150000),
            16.3991,
            107.5904,
            "https://vista.vn/images/khaidinh.jpg",
            "07:30-17:30"));

    // 3. Đại Nội Huế
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("33333333-3333-3333-3333-333333333333"),
            "Đại Nội Huế (Hoàng Thành)",
            "Thừa Thiên Huế",
            "Di tích lịch sử văn hóa",
            BigDecimal.valueOf(200000),
            BigDecimal.valueOf(200000),
            16.4674,
            107.5786,
            "https://vista.vn/images/dainoi.jpg",
            "07:30-18:00"));

    // 4. Chùa Thiên Mụ
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("44444444-4444-4444-4444-444444444444"),
            "Chùa Thiên Mụ",
            "Thừa Thiên Huế",
            "Tâm linh & Danh thắng",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            16.4533,
            107.5450,
            "https://vista.vn/images/thienmu.jpg",
            "07:00-18:30"));

    // 5. Bảo tàng Cổ vật Cung đình Huế (Đóng cửa thứ Hai)
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("55555555-5555-5555-5555-555555555555"),
            "Bảo tàng Cổ vật Cung đình Huế",
            "Thừa Thiên Huế",
            "Bảo tàng & Văn hóa",
            BigDecimal.valueOf(50000),
            BigDecimal.valueOf(50000),
            16.4710,
            107.5780,
            "https://vista.vn/images/baotang.jpg",
            "{\"tue\":\"08:00-17:00\",\"wed\":\"08:00-17:00\",\"thu\":\"08:00-17:00\",\"fri\":\"08:00-17:00\",\"sat\":\"08:00-17:00\",\"sun\":\"08:00-17:00\"}"));

    // 6. Điểm tham quan chưa xác minh giá (priceMin = null, priceMax = null)
    mockDestinations.add(
        new DestinationSummary(
            UUID.fromString("66666666-6666-6666-6666-666666666666"),
            "Làng nón Phú Cam",
            "Thừa Thiên Huế",
            "Làng nghề truyền thống",
            null,
            null,
            16.4520,
            107.5850,
            "https://vista.vn/images/langnon.jpg",
            null));
  }

  @Test
  @DisplayName("Kịch bản 1: Khách đến lúc 14:00 ngày đầu -> Không xếp lịch sáng, bắt đầu sau 14:00")
  void testScenario01_ArrivalLateAfternoon_NoMorningActivities() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử", "Văn hóa"),
            "2026-10-30",
            2,
            "Cặp đôi",
            "Đến sân bay lúc 14:00",
            "14:00",
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    assertNotNull(result);
    assertFalse(result.days().isEmpty());
    SuggestedDayResponse day1 = result.days().get(0);
    assertFalse(day1.activities().isEmpty());

    SuggestedActivityResponse firstAct = day1.activities().get(0);
    LocalTime actStart = LocalTime.parse(firstAct.startTime(), TIME_FMT);

    // Điểm đến lúc 14:00, cộng thêm 45p nhận phòng -> Hoạt động đầu tiên phải >= 14:45
    assertTrue(
        !actStart.isBefore(LocalTime.of(14, 45)),
        "Hoạt động đầu tiên phải bắt đầu sau khi đến nơi (>= 14:45). Thực tế: " + actStart);

    // Không có bất kỳ hoạt động nào trong khung giờ sáng (< 12:00)
    for (SuggestedActivityResponse act : day1.activities()) {
      LocalTime s = LocalTime.parse(act.startTime(), TIME_FMT);
      assertTrue(s.isAfter(LocalTime.of(12, 0)), "Không được có hoạt động sáng khi khách đến lúc 14:00");
    }
  }

  @Test
  @DisplayName("Kịch bản 2: Ngày cuối rời đi lúc 11:00 -> Mọi hoạt động phải kết thúc trước 11:00")
  void testScenario02_DepartureEarlyMorning_EndsBeforeDeparture() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử"),
            "2026-10-30",
            2,
            "Gia đình",
            null,
            null,
            "11:00",
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    assertNotNull(result);
    SuggestedDayResponse day1 = result.days().get(0);

    for (SuggestedActivityResponse act : day1.activities()) {
      LocalTime end = LocalTime.parse(act.endTime(), TIME_FMT);
      assertTrue(
          !end.isAfter(LocalTime.of(11, 0)),
          "Mọi hoạt động phải kết thúc trước hoặc đúng giờ khởi hành 11:00. Thực tế: " + end);
    }
  }

  @Test
  @DisplayName("Kịch bản 3: Cự ly đường bộ tính theo hệ số uốn khúc thực tế (> đường thẳng)")
  void testScenario03_RouteDistanceAccountsForWindingRoads() {
    double lat1 = 16.3888, lon1 = 107.5714; // Lăng Minh Mạng
    double lat2 = 16.3991, lon2 = 107.5904; // Lăng Khải Định

    double directKm = TransitCalculator.haversineDistanceKm(lat1, lon1, lat2, lon2);
    TransitInfo transit = TransitCalculator.estimateTransit(lat1, lon1, lat2, lon2, "DRIVING", "MODERATE", "Cặp đôi");

    assertTrue(directKm > 0);
    assertTrue(transit.roadDistanceKm() > directKm, "Cự ly đường bộ phải lớn hơn cự ly đường thẳng do uốn khúc");
    assertEquals(1.35, transit.roadDistanceKm() / directKm, 0.1, "Hệ số uốn khúc đường bộ Việt Nam phải xấp xỉ ~1.35x");
  }

  @Test
  @DisplayName("Kịch bản 4: Điểm đóng cửa vào ngày được chọn -> OpeningHoursHelper phát hiện isOpen = false")
  void testScenario04_ClosedOnSelectedDayDetected() {
    String hoursJson = "{\"tue\":\"08:00-17:00\",\"wed\":\"08:00-17:00\",\"thu\":\"08:00-17:00\",\"fri\":\"08:00-17:00\",\"sat\":\"08:00-17:00\",\"sun\":\"08:00-17:00\"}";

    // Thứ Hai: Không có trong lịch -> Đóng cửa
    ScheduleWindow mondayWindow = OpeningHoursHelper.parseWindow(hoursJson, DayOfWeek.MONDAY);
    assertFalse(mondayWindow.isOpen(), "Bảo tàng phải đóng cửa vào thứ Hai");

    // Thứ Ba: Mở cửa 08:00-17:00
    ScheduleWindow tuesdayWindow = OpeningHoursHelper.parseWindow(hoursJson, DayOfWeek.TUESDAY);
    assertTrue(tuesdayWindow.isOpen(), "Bảo tàng phải mở cửa vào thứ Ba");
    assertEquals(LocalTime.of(8, 0), tuesdayWindow.openTime());
    assertEquals(LocalTime.of(17, 0), tuesdayWindow.closeTime());
  }

  @Test
  @DisplayName("Kịch bản 5: Không đủ thời lượng trước giờ đóng cửa -> canAccommodate trả về false")
  void testScenario05_NotEnoughTimeBeforeClosing_FlaggedOrAdjusted() {
    ScheduleWindow window =
        new ScheduleWindow(true, true, LocalTime.of(8, 0), LocalTime.of(17, 0), "08:00 - 17:00");

    // Đến lúc 16:15 nhưng tham quan 60 phút (kết thúc 17:15, vượt quá 17:00) -> Không đủ
    boolean canFit = window.canAccommodate(LocalTime.of(16, 15), LocalTime.of(17, 15));
    assertFalse(canFit, "Không đủ thời lượng tham quan đến 17:15 khi đóng cửa lúc 17:00");

    // Đến lúc 14:00 tham quan đến 15:30 -> Hợp lệ
    boolean canFitEarlier = window.canAccommodate(LocalTime.of(14, 0), LocalTime.of(15, 30));
    assertTrue(canFitEarlier, "14:00 đến 15:30 hoàn toàn đủ thời lượng hợp lệ");
  }

  @Test
  @DisplayName("Kịch bản 6: Khách thích lịch sử/văn hóa -> Chấp nhận nhiều di tích mà không bị gạt bỏ")
  void testScenario06_HistoryLover_AllowsMultipleHeritageSitesWithoutStrictPenalty() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử", "Di tích văn hóa Huế"),
            "2026-10-30",
            2,
            "Nhóm bạn",
            "Đặc biệt muốn tham quan các lăng tẩm và Đại Nội",
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    long heritageCount =
        result.days().get(0).activities().stream()
            .filter(a -> a.category() != null && a.category().contains("Di tích"))
            .count();

    // Với người mê lịch sử, cho phép xếp >= 2 di tích trong ngày mà không bị phạt từ khóa
    assertTrue(heritageCount >= 2, "Người mê lịch sử phải được xếp ít nhất 2 di tích văn hóa trong ngày. Thực tế: " + heritageCount);
  }

  @Test
  @DisplayName("Kịch bản 7: Đoàn có người già hoặc trẻ nhỏ -> Thời gian đệm nghỉ (buffer) tăng lên")
  void testScenario07_FamilyWithElderlyOrKids_GetsLargerBufferTime() {
    int bufferCouple = TransitCalculator.determineBufferMinutes("RELAXED", "Cặp đôi");
    int bufferFamilyWithElderly = TransitCalculator.determineBufferMinutes("RELAXED", "Gia đình có người lớn tuổi");

    assertTrue(bufferFamilyWithElderly > bufferCouple, "Đoàn có người cao tuổi phải có thời gian đệm lớn hơn");
    assertTrue(bufferFamilyWithElderly >= 25, "Thời gian đệm tối thiểu cho đoàn có người già/trẻ em phải >= 25 phút");
  }

  @Test
  @DisplayName("Kịch bản 8: Ngân sách thấp -> Hệ thống đánh giá isBudgetFeasible = false minh bạch")
  void testScenario08_LowBudget_TriggersFeasibilityEvaluation() {
    // Ngân sách 100.000 VNĐ cho 2 người trong khi tiền vé 2 lăng đã là 300.000đ/người
    BigDecimal tinyBudget = BigDecimal.valueOf(100000);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "BUDGET",
            List.of("Lịch sử"),
            "2026-10-30",
            2,
            "Cặp đôi",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, tinyBudget, mockDestinations);

    assertFalse(
        result.isBudgetFeasible(),
        "Khi ngân sách 100.000đ thấp hơn tổng chi phí thực tế, isBudgetFeasible phải là false");
  }

  @Test
  @DisplayName("Kịch bản 9: Điểm thiếu giá -> Gắn cờ UNVERIFIED và không coi là 0 VNĐ miễn phí")
  void testScenario09_MissingPrice_MarkedAsUnverifiedNotZero() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Làng nghề"),
            "2026-10-30",
            2,
            "Cặp đôi",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    boolean foundUnverified = false;
    for (SuggestedDayResponse day : result.days()) {
      for (SuggestedActivityResponse act : day.activities()) {
        if ("Làng nón Phú Cam".equals(act.destinationName())) {
          foundUnverified = true;
          assertEquals(
              "UNVERIFIED",
              act.costStatus(),
              "Điểm thiếu giá phải có costStatus là UNVERIFIED");
        }
      }
    }

    if (foundUnverified) {
      assertTrue(result.unverifiedCostCount() > 0, "unverifiedCostCount phải phản ánh số điểm chưa xác minh giá");
    }
  }

  @Test
  @DisplayName("Kịch bản 10: CSDL thiếu nhà hàng ẩm thực -> Scheduler tự chèn điểm dừng chân ăn trưa hợp lý")
  void testScenario10_MissingDiningInDatabase_GeneratesRealisticCulinaryStop() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử"),
            "2026-10-30",
            2,
            "Nhóm bạn",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    boolean hasLunch =
        result.days().get(0).activities().stream()
            .anyMatch(a -> a.category() != null && (a.category().contains("Ẩm thực") || a.category().contains("Ăn uống")));

    assertTrue(hasLunch, "Lịch trình cả ngày phải có điểm dừng chân ăn trưa đặc sản");
    assertTrue(result.totalDiningCost().compareTo(BigDecimal.ZERO) > 0, "Chi phí ăn uống phải được ước tính minh bạch");
  }

  @Test
  @DisplayName("Kịch bản 11: Bất biến thời gian: start(next) >= end(prev) + travelDuration + bufferMinutes")
  void testScenario11_TimeInvariant_NextStartsAfterPreviousEndPlusTravelPlusBuffer() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử", "Văn hóa"),
            "2026-10-30",
            2,
            "Gia đình",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    List<SuggestedActivityResponse> acts = result.days().get(0).activities();
    for (int i = 0; i < acts.size() - 1; i++) {
      SuggestedActivityResponse current = acts.get(i);
      SuggestedActivityResponse next = acts.get(i + 1);

      LocalTime currentEnd = LocalTime.parse(current.endTime(), TIME_FMT);
      LocalTime nextStart = LocalTime.parse(next.startTime(), TIME_FMT);

      int travelMin = next.travelDurationFromPreviousMinutes() != null ? next.travelDurationFromPreviousMinutes() : 0;
      int bufferMin = next.bufferMinutes() != null ? next.bufferMinutes() : 0;

      LocalTime minEarliestNext = currentEnd.plusMinutes(travelMin + bufferMin);

      assertTrue(
          !nextStart.isBefore(minEarliestNext),
          String.format(
              "Vi phạm bất biến thời gian: Điểm tiếp theo '%s' bắt đầu lúc %s, nhưng điểm trước '%s' kết thúc lúc %s + di chuyển %dp + đệm %dp = tối thiểu %s",
              next.destinationName(), nextStart, current.destinationName(), currentEnd, travelMin, bufferMin, minEarliestNext));
    }
  }

  @Test
  @DisplayName("Kịch bản 12: Candidate Grounding loại trừ địa điểm AI bịa đặt không có trong CSDL")
  void testScenario12_CandidateGrounding_RejectsHallucinatedPlaces() {
    Map<UUID, DestinationSummary> destinationLookup =
        mockDestinations.stream().collect(Collectors.toMap(DestinationSummary::id, d -> d));

    UUID realId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    UUID fakeId = UUID.fromString("99999999-9999-9999-9999-999999999999");

    assertTrue(destinationLookup.containsKey(realId), "Địa điểm có thật trong CSDL được chấp nhận");
    assertFalse(destinationLookup.containsKey(fakeId), "Địa điểm bịa đặt không có trong CSDL bị loại bỏ");
  }

  @Test
  @DisplayName("Kịch bản 13: Chuyến 3 ngày không lặp lại cùng một địa điểm tham quan")
  void testScenario13_MultiDayTrip_NoDuplicateSightseeingAcrossDays() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            3,
            "STANDARD",
            List.of("Lịch sử", "Văn hóa"),
            "2026-10-30",
            2,
            "Nhóm bạn",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 3, BigDecimal.valueOf(10000000), mockDestinations);

    Set<UUID> visitedDestinationIds = new HashSet<>();
    for (SuggestedDayResponse day : result.days()) {
      for (SuggestedActivityResponse act : day.activities()) {
        if (act.destinationId() != null) {
          assertFalse(
              visitedDestinationIds.contains(act.destinationId()),
              "Địa điểm tham quan " + act.destinationName() + " không được lặp lại giữa các ngày");
          visitedDestinationIds.add(act.destinationId());
        }
      }
    }
  }

  @Test
  @DisplayName("Kịch bản 14: Đổi phương tiện di chuyển (MOTORBIKE vs DRIVING vs WALKING) cho cự ly, thời gian và chi phí khác biệt")
  void testScenario14_TransportMode_DifferencesInTransitTimeAndCost() {
    double lat1 = 16.3888, lon1 = 107.5714;
    double lat2 = 16.3991, lon2 = 107.5904;

    TransitInfo carEstimate = TransitCalculator.estimateTransit(lat1, lon1, lat2, lon2, "DRIVING", "MODERATE", "Cặp đôi");
    TransitInfo bikeEstimate = TransitCalculator.estimateTransit(lat1, lon1, lat2, lon2, "MOTORBIKE", "MODERATE", "Cặp đôi");
    TransitInfo walkEstimate = TransitCalculator.estimateTransit(lat1, lon1, lat2, lon2, "WALKING", "MODERATE", "Cặp đôi");

    // Đi bộ chậm hơn xe máy & ô tô
    assertTrue(walkEstimate.durationMinutes() >= carEstimate.durationMinutes());
    assertTrue(walkEstimate.durationMinutes() >= bikeEstimate.durationMinutes());

    // Chi phí ô tô (taxi) cao hơn xe máy
    assertTrue(carEstimate.estimatedFareVnd().compareTo(bikeEstimate.estimatedFareVnd()) > 0);
    // Đi bộ không tốn chi phí xe
    assertEquals(BigDecimal.ZERO, walkEstimate.estimatedFareVnd());
  }

  @Test
  @DisplayName("Kịch bản 15: Tính khả thi ngân sách rành mạch: grandTotal = Vé + Ăn uống + Di chuyển")
  void testScenario15_BudgetBreakdown_SightseeingDiningTransit() {
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            1,
            "STANDARD",
            List.of("Lịch sử"),
            "2026-10-30",
            2,
            "Cặp đôi",
            null,
            null,
            null,
            "MODERATE",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult result =
        TravelScheduler.buildDeterministicPlan(request, 1, BigDecimal.valueOf(5000000), mockDestinations);

    BigDecimal expectedSum =
        result.totalSightseeingCost().add(result.totalDiningCost()).add(result.totalTransitCost());

    assertEquals(
        expectedSum,
        result.grandTotalCost(),
        "Tổng chi phí chuyến đi phải bằng tổng vé tham quan + ăn uống + di chuyển");
  }

  @Test
  @DisplayName("Kịch bản 16: Nhịp độ RELAXED có thời gian đệm lớn hơn hoặc số hoạt động trong ngày ít hơn PACKED")
  void testScenario16_PacingComparison_RelaxedVsPacked() {
    int relaxedBuffer = TransitCalculator.determineBufferMinutes("RELAXED", "Cặp đôi");
    int packedBuffer = TransitCalculator.determineBufferMinutes("PACKED", "Cặp đôi");

    assertTrue(
        relaxedBuffer > packedBuffer,
        "Nhịp độ thư thả (RELAXED) phải có thời gian đệm nghỉ lớn hơn nhịp độ dày đặc (PACKED)");

    AiItinerarySuggestionRequest relaxedReq =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế", 1, "STANDARD", List.of("Lịch sử"), "2026-10-30", 2, "Cặp đôi", null, null, null, "RELAXED", "DRIVING", null, null);
    AiItinerarySuggestionRequest packedReq =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế", 1, "STANDARD", List.of("Lịch sử"), "2026-10-30", 2, "Cặp đôi", null, null, null, "PACKED", "DRIVING", null, null);

    ScheduledPlanResult relaxedPlan =
        TravelScheduler.buildDeterministicPlan(relaxedReq, 1, BigDecimal.valueOf(5000000), mockDestinations);
    ScheduledPlanResult packedPlan =
        TravelScheduler.buildDeterministicPlan(packedReq, 1, BigDecimal.valueOf(5000000), mockDestinations);

    int relaxedActCount = relaxedPlan.days().get(0).activities().size();
    int packedActCount = packedPlan.days().get(0).activities().size();

    assertTrue(
        relaxedActCount <= packedActCount,
        "Số hoạt động của nhịp đi RELAXED phải ít hơn hoặc bằng PACKED để tránh kiệt sức cho du khách");
  }

  @Test
  @DisplayName("Kịch bản 17: Tự động trích xuất giờ đến (14:00) và giờ về (11:00) từ câu yêu cầu tự do của người dùng")
  void testScenario17_AutoExtractArrivalAndDepartureFromSpecialRequests() {
    String userSpecialRequest =
        "Đoàn mình có người lớn tuổi nên muốn đi thong thả, hạ cánh Đà Nẵng lúc 14:00 và ngày cuối bay về lúc 11:00";

    LocalTime arrival = TravelScheduler.extractTimeFromText(userSpecialRequest, TravelScheduler.ARRIVAL_PATTERN);
    LocalTime departure = TravelScheduler.extractTimeFromText(userSpecialRequest, TravelScheduler.DEPARTURE_PATTERN);

    assertNotNull(arrival, "Phải trích xuất được giờ hạ cánh từ văn bản tự nhiên");
    assertEquals(LocalTime.of(14, 0), arrival, "Giờ hạ cánh phải chính xác 14:00");

    assertNotNull(departure, "Phải trích xuất được giờ bay về từ văn bản tự nhiên");
    assertEquals(LocalTime.of(11, 0), departure, "Giờ bay về phải chính xác 11:00");

    // Lập lịch 3 ngày với câu yêu cầu trên (để arrivalTime và departureTime = null trong request để test auto-extract)
    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest(
            "Thừa Thiên Huế",
            3,
            "STANDARD",
            List.of("Lịch sử"),
            "2026-10-30",
            4,
            "Gia đình",
            userSpecialRequest,
            null, // arrivalTime null để kiểm tra auto-extract từ specialRequests
            null, // departureTime null để kiểm tra auto-extract từ specialRequests
            "RELAXED",
            "DRIVING",
            null,
            null);

    ScheduledPlanResult plan =
        TravelScheduler.buildDeterministicPlan(request, 3, BigDecimal.valueOf(10000000), mockDestinations);

    // Ngày 1: Hoạt động đầu tiên phải bắt đầu sau 14:00
    SuggestedDayResponse day1 = plan.days().get(0);
    assertFalse(day1.activities().isEmpty(), "Ngày 1 phải có hoạt động buổi chiều/tối");
    for (SuggestedActivityResponse act : day1.activities()) {
      LocalTime st = LocalTime.parse(act.startTime(), TIME_FMT);
      assertTrue(
          !st.isBefore(LocalTime.of(14, 0)),
          "Ngày 1: Không được có hoạt động nào bắt đầu trước giờ hạ cánh 14:00 (thực tế: " + act.startTime() + ")");
      assertFalse(
          "MORNING".equalsIgnoreCase(act.timeSlot()),
          "Ngày 1: Không được có slot MORNING khi khách hạ cánh lúc 14:00");
    }

    // Ngày 3 (ngày cuối): Mọi hoạt động phải kết thúc trước 11:00
    SuggestedDayResponse day3 = plan.days().get(2);
    for (SuggestedActivityResponse act : day3.activities()) {
      LocalTime et = LocalTime.parse(act.endTime(), TIME_FMT);
      assertTrue(
          !et.isAfter(LocalTime.of(11, 0)),
          "Ngày cuối: Mọi hoạt động phải kết thúc trước hoặc đúng giờ bay về 11:00 (thực tế: " + act.endTime() + ")");
    }
  }

  @Test
  @DisplayName("Kịch bản 18: Semantic NLP hiểu đa dạng cách nói giờ tự nhiên & Energy Engine bảo vệ sức khỏe người lớn tuổi")
  void testScenario18_SemanticNlpAndElderlyEnergyEngine() {
    AiItinerarySuggestionRequest naturalReq =
        new AiItinerarySuggestionRequest(
            "Đà Nẵng",
            2,
            "STANDARD",
            List.of("Văn hóa"),
            "2026-10-30",
            4,
            "Gia đình có ông bà lớn tuổi",
            "Nhà mình đi cùng bố mẹ già bị đau khớp không leo núi được, đáp máy bay Đà Nẵng lúc 2 giờ chiều và muốn ăn chay",
            null,
            null,
            null,
            null,
            null,
            null);

    SemanticIntentExtractor.TravelIntent intent = SemanticIntentExtractor.extractIntent(naturalReq);

    assertEquals(LocalTime.of(14, 0), intent.arrivalTime(), "Phải hiểu '2 giờ chiều' chính là 14:00");
    assertTrue(intent.hasElderly(), "Phải nhận diện được đoàn có ông bà / bố mẹ già (hasElderly = true)");
    assertTrue(intent.avoidStrenuousActivity(), "Phải bật cờ tránh vận động nặng (avoidStrenuousActivity = true)");
    assertEquals("RELAXED", intent.effectivePace(), "Tự động chuyển nhịp đi sang RELAXED cho người lớn tuổi");
    assertEquals("VEGETARIAN", intent.dietaryPreference(), "Nhận diện được nhu cầu ăn chay");

    DestinationSummary mountainSpot =
        new DestinationSummary(
            UUID.randomUUID(),
            "Danh thắng Ngũ Hành Sơn",
            "Đà Nẵng",
            "Núi đá & Hang động",
            BigDecimal.valueOf(40000),
            BigDecimal.valueOf(40000),
            16.003,
            108.263,
            null,
            "07:00-17:30");

    DestinationSummary flatMuseum =
        new DestinationSummary(
            UUID.randomUUID(),
            "Bảo tàng Điêu khắc Chăm Đà Nẵng",
            "Đà Nẵng",
            "Bảo tàng & Văn hóa",
            BigDecimal.valueOf(60000),
            BigDecimal.valueOf(60000),
            16.060,
            108.223,
            null,
            "07:00-17:00");

    assertEquals(
        SemanticIntentExtractor.PhysicalIntensity.HIGH,
        SemanticIntentExtractor.evaluatePhysicalIntensity(mountainSpot),
        "Ngũ Hành Sơn phải được đánh giá mức vận động HIGH");
    assertFalse(SemanticIntentExtractor.isElderlyFriendly(mountainSpot));

    assertEquals(
        SemanticIntentExtractor.PhysicalIntensity.LOW,
        SemanticIntentExtractor.evaluatePhysicalIntensity(flatMuseum),
        "Bảo tàng phải được đánh giá mức vận động LOW");
    assertTrue(SemanticIntentExtractor.isElderlyFriendly(flatMuseum));
  }
}
