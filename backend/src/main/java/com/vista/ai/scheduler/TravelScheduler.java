package com.vista.ai.scheduler;

import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.destination.application.DestinationSummary;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Bộ máy lập lịch du lịch thực tế (Deterministic Travel Scheduling Engine).
 * Đảm bảo:
 * 1. Bất biến thời gian: start(next) >= end(previous) + travelDuration + bufferMinutes.
 * 2. Tôn trọng giờ mở cửa và ngày đóng cửa thực tế từ CSDL.
 * 3. Hỗ trợ giờ đến muộn ngày 1 (arrivalTime) và giờ về sớm ngày cuối (departureTime).
 * 4. Không ép cố định 4 slot nếu thời gian hoặc nhịp độ không cho phép.
 * 5. Tính chi phí minh bạch: vé tham quan, ăn uống, di chuyển và cờ UNVERIFIED.
 * 6. Đa dạng hóa theo sở thích người dùng (cho phép nhiều di tích nếu thích lịch sử).
 */
public final class TravelScheduler {

  public static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

  public static final Pattern ARRIVAL_PATTERN = Pattern.compile(
      "(?i)(?:den|ha\\s*canh|toi|check-?in|co\\s*mat|dap|bay\\s*den)[^0-9\\n]{0,40}(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?");
  public static final Pattern DEPARTURE_PATTERN = Pattern.compile(
      "(?i)(?:ve|roi|bay\\s*ve|khoi\\s*hanh\\s*ve|tra\\s*phong|check-?out|roi\\s*khoi)[^0-9\\n]{0,40}(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?");

  public static LocalTime extractTimeFromText(String text, Pattern pattern) {
    if (text == null || text.isBlank()) return null;
    String norm = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
        .toLowerCase(Locale.ROOT);
    java.util.regex.Matcher m = pattern.matcher(norm);
    if (m.find()) {
      try {
        int h = Integer.parseInt(m.group(1));
        int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
          return LocalTime.of(h, min);
        }
      } catch (Exception ignored) {}
    }
    return null;
  }

  private TravelScheduler() {}

  public record ScheduledPlanResult(
      List<SuggestedDayResponse> days,
      BigDecimal totalSightseeingCost,
      BigDecimal totalDiningCost,
      BigDecimal totalTransitCost,
      BigDecimal grandTotalCost,
      boolean isBudgetFeasible,
      int unverifiedCostCount,
      String strategicRationale,
      String companionFitRationale,
      String budgetOptimizationRationale,
      String pacingSummary,
      String localAdviceSummary) {}

  /**
   * Tạo lịch trình hoàn chỉnh có căn cứ và bất biến thời gian từ danh sách địa điểm PUBLISHED.
   */
  public static ScheduledPlanResult buildDeterministicPlan(
      AiItinerarySuggestionRequest request,
      int daysCount,
      BigDecimal budgetVnd,
      List<DestinationSummary> destinations) {

    SemanticIntentExtractor.TravelIntent intent = SemanticIntentExtractor.extractIntent(request);
    LocalDate startDate = parseStartDate(request.startDate());
    LocalTime arrivalTime = intent.arrivalTime();
    LocalTime departureTime = intent.departureTime();

    int people = request.peopleCount() != null && request.peopleCount() > 0 ? request.peopleCount() : 2;
    String pace = intent.effectivePace();
    String travelMode = intent.effectiveTravelMode();
    String travelWith = request.travelWith() != null ? request.travelWith() : "Nhóm bạn";
    List<String> userInterests = request.interests() != null ? request.interests() : List.of("Khám phá", "Ẩm thực");

    boolean userLovesHistory = isHistoryFocused(userInterests, request.specialRequests());

    List<DestinationSummary> pool = new ArrayList<>(destinations != null ? destinations : List.of());
    Set<UUID> usedDestinationIds = new HashSet<>();

    List<SuggestedDayResponse> scheduledDays = new ArrayList<>();
    BigDecimal totalSightseeing = BigDecimal.ZERO;
    BigDecimal totalDining = BigDecimal.ZERO;
    BigDecimal totalTransit = BigDecimal.ZERO;
    int unverifiedCosts = 0;

    for (int dayNum = 1; dayNum <= daysCount; dayNum++) {
      LocalDate currentDayDate = startDate.plusDays(dayNum - 1);
      DayOfWeek dayOfWeek = currentDayDate.getDayOfWeek();
      String dateLabel = "Ngày " + dayNum + " (" + formatDateLabel(currentDayDate) + ")";

      // Xác định khoảng thời gian khả dụng của ngày
      LocalTime dayEarliestStart = LocalTime.of(8, 0);
      LocalTime dayLatestEnd = LocalTime.of(21, 30);

      if (dayNum == 1 && arrivalTime != null) {
        // Ngày đầu: Có mặt tại điểm đến lúc arrivalTime -> cộng 45-60 phút nhận phòng / cất đồ
        LocalTime effectiveArrival = arrivalTime.plusMinutes(45);
        if (effectiveArrival.isAfter(dayEarliestStart)) {
          dayEarliestStart = effectiveArrival;
        }
      }

      if (dayNum == daysCount && departureTime != null) {
        // Ngày cuối: Phải rời đi lúc departureTime -> hoạt động phải kết thúc trước 60 phút
        LocalTime effectiveDeparture = departureTime.minusMinutes(60);
        if (effectiveDeparture.isBefore(dayLatestEnd)) {
          dayLatestEnd = effectiveDeparture;
        }
      }

      List<SuggestedActivityResponse> dayActivities = new ArrayList<>();
      List<DestinationSummary> daySelectedDests = new ArrayList<>();
      LocalTime currentTimeCursor = dayEarliestStart;
      DestinationSummary previousDest = null;

      // 1. CHẶNG BUỔI SÁNG (Chỉ xếp nếu thời gian bắt đầu trước 11:00)
      if (currentTimeCursor.isBefore(LocalTime.of(11, 0)) && dayLatestEnd.isAfter(LocalTime.of(10, 0))) {
        DestinationSummary morningCand =
            findBestCandidate(
                pool,
                usedDestinationIds,
                daySelectedDests,
                "MORNING",
                previousDest,
                dayOfWeek,
                currentTimeCursor,
                userInterests,
                userLovesHistory,
                intent);

        if (morningCand != null) {
          int visitDuration = determineVisitDuration(morningCand);
          TransitCalculator.TransitInfo transit =
              TransitCalculator.estimateTransit(
                  previousDest != null ? previousDest.latitude() : null,
                  previousDest != null ? previousDest.longitude() : null,
                  morningCand.latitude(),
                  morningCand.longitude(),
                  travelMode,
                  pace,
                  travelWith);

          LocalTime actStart = currentTimeCursor;
          LocalTime actEnd = actStart.plusMinutes(visitDuration);

          // Kiểm tra giờ đóng cửa
          OpeningHoursHelper.ScheduleWindow window =
              OpeningHoursHelper.parseWindow(morningCand.openingHours(), dayOfWeek);
          String warning = null;
          if (window.isVerified() && window.closeTime() != null && actEnd.isAfter(window.closeTime())) {
            actEnd = window.closeTime();
            warning = "Đã điều chỉnh giờ tham quan do điểm đến đóng cửa lúc " + window.closeTime().format(TIME_FMT);
          }
          if (!window.isVerified()) {
            warning = "Giờ mở cửa chưa được kiểm chứng chính thức, nên liên hệ trước khi đến.";
          }

          CostEstimation costEst = evaluateCost(morningCand, people);
          if ("UNVERIFIED".equals(costEst.costStatus)) unverifiedCosts++;
          totalSightseeing = totalSightseeing.add(costEst.totalVnd);
          totalTransit = totalTransit.add(transit.estimatedFareVnd());

          usedDestinationIds.add(morningCand.id());
          daySelectedDests.add(morningCand);

          dayActivities.add(
              new SuggestedActivityResponse(
                  morningCand.id(),
                  "MORNING",
                  morningCand.name(),
                  costEst.totalVnd,
                  morningCand.categoryName(),
                  morningCand.name() + " — Điểm khởi đầu lý tưởng theo khung giờ râm mát đầu ngày.",
                  "Khám phá cảnh quan và di sản văn hóa khi thời tiết mát mẻ và vắng khách.",
                  "Khung giờ sáng (" + actStart.format(TIME_FMT) + " – " + actEnd.format(TIME_FMT) + ") trời dịu mát, nắng chưa gắt, chụp ảnh đẹp và thoải mái dạo chơi.",
                  "Điểm đến mang tính biểu tượng cao với kiến trúc đặc sắc và chiều sâu lịch sử văn hóa.",
                  actStart.format(TIME_FMT),
                  actEnd.format(TIME_FMT),
                  visitDuration,
                  previousDest != null ? transit.durationMinutes() : 0,
                  transit.bufferMinutes(),
                  costEst.costStatus,
                  warning));

          previousDest = morningCand;
          currentTimeCursor = actEnd.plusMinutes(transit.bufferMinutes());
        }
      }

      // 2. CHẶNG BUỔI TRƯA: ĂN TRƯA & NGHỈ NGƠI MÁT MẺ (Nếu ngày hoạt động bao gồm giờ trưa)
      if (currentTimeCursor.isBefore(LocalTime.of(13, 30)) && dayLatestEnd.isAfter(LocalTime.of(12, 30))) {
        LocalTime lunchStart = currentTimeCursor.isBefore(LocalTime.of(11, 45)) ? LocalTime.of(11, 45) : currentTimeCursor;
        DestinationSummary foodCand = findCulinaryCandidate(pool, usedDestinationIds, previousDest, dayOfWeek);

        int lunchDuration = 75; // 75 phút ăn trưa nghỉ ngơi thư thả
        TransitCalculator.TransitInfo transit =
            TransitCalculator.estimateTransit(
                previousDest != null ? previousDest.latitude() : null,
                previousDest != null ? previousDest.longitude() : null,
                foodCand != null ? foodCand.latitude() : null,
                foodCand != null ? foodCand.longitude() : null,
                travelMode,
                pace,
                travelWith);

        LocalTime actualLunchStart = lunchStart.plusMinutes(previousDest != null ? transit.durationMinutes() : 0);
        LocalTime actualLunchEnd = actualLunchStart.plusMinutes(lunchDuration);

        // Chi phí ăn trưa ước tính (60.000đ - 90.000đ / người)
        BigDecimal diningCost = BigDecimal.valueOf(70000L * people);
        totalDining = totalDining.add(diningCost);
        totalTransit = totalTransit.add(transit.estimatedFareVnd());

        UUID foodId = foodCand != null ? foodCand.id() : UUID.randomUUID();
        String foodName = foodCand != null ? foodCand.name() : ("Thưởng thức Ẩm thực Bản địa " + request.destinationProvince());
        String foodCat = foodCand != null ? foodCand.categoryName() : "Ẩm thực & Đặc sản";

        if (foodCand != null) {
          usedDestinationIds.add(foodCand.id());
          daySelectedDests.add(foodCand);
          previousDest = foodCand;
        }

        dayActivities.add(
            new SuggestedActivityResponse(
                foodId,
                "NOON",
                foodName,
                diningCost,
                foodCat,
                "Dừng chân ăn trưa, nạp lại năng lượng và thưởng thức món ngon đặc sản trong không gian mát mẻ.",
                "Trải nghiệm hương vị bản địa và nghỉ ngơi tránh cái nắng gay gắt giữa trưa.",
                "Khung giờ trưa (" + actualLunchStart.format(TIME_FMT) + " – " + actualLunchEnd.format(TIME_FMT) + ") nắng gắt nhất trong ngày, hoàn hảo để dừng chân ăn uống và hồi phục thể lực.",
                "Đặc sản chuẩn vị truyền thống của vùng đất " + request.destinationProvince() + " với giá cả hợp lý và không khí ấm cúng.",
                actualLunchStart.format(TIME_FMT),
                actualLunchEnd.format(TIME_FMT),
                lunchDuration,
                transit.durationMinutes(),
                transit.bufferMinutes(),
                "ESTIMATED",
                null));

        currentTimeCursor = actualLunchEnd.plusMinutes(transit.bufferMinutes());
      }

      // 3. CHẶNG BUỔI CHIỀU (Nếu thời gian còn lại trước dayLatestEnd ít nhất 90 phút)
      if (currentTimeCursor.isBefore(dayLatestEnd.minusMinutes(60)) && currentTimeCursor.isBefore(LocalTime.of(17, 30))) {
        LocalTime afternoonStart = currentTimeCursor.isBefore(LocalTime.of(14, 0)) ? LocalTime.of(14, 0) : currentTimeCursor;
        DestinationSummary afternoonCand =
            findBestCandidate(
                pool,
                usedDestinationIds,
                daySelectedDests,
                "AFTERNOON",
                previousDest,
                dayOfWeek,
                afternoonStart,
                userInterests,
                userLovesHistory,
                intent);

        if (afternoonCand != null) {
          int visitDuration = determineVisitDuration(afternoonCand);
          TransitCalculator.TransitInfo transit =
              TransitCalculator.estimateTransit(
                  previousDest != null ? previousDest.latitude() : null,
                  previousDest != null ? previousDest.longitude() : null,
                  afternoonCand.latitude(),
                  afternoonCand.longitude(),
                  travelMode,
                  pace,
                  travelWith);

          LocalTime actStart = afternoonStart.plusMinutes(transit.durationMinutes());
          LocalTime actEnd = actStart.plusMinutes(visitDuration);

          if (actEnd.isAfter(dayLatestEnd)) {
            actEnd = dayLatestEnd;
          }

          OpeningHoursHelper.ScheduleWindow window =
              OpeningHoursHelper.parseWindow(afternoonCand.openingHours(), dayOfWeek);
          String warning = null;
          if (window.isVerified() && window.closeTime() != null && actEnd.isAfter(window.closeTime())) {
            actEnd = window.closeTime();
            warning = "Lưu ý điểm đến đóng cửa lúc " + window.closeTime().format(TIME_FMT);
          }
          if (!window.isVerified()) {
            warning = "Giờ mở cửa chưa được kiểm chứng, nên tra cứu trước khi xuất phát.";
          }

          CostEstimation costEst = evaluateCost(afternoonCand, people);
          if ("UNVERIFIED".equals(costEst.costStatus)) unverifiedCosts++;
          totalSightseeing = totalSightseeing.add(costEst.totalVnd);
          totalTransit = totalTransit.add(transit.estimatedFareVnd());

          usedDestinationIds.add(afternoonCand.id());
          daySelectedDests.add(afternoonCand);

          dayActivities.add(
              new SuggestedActivityResponse(
                  afternoonCand.id(),
                  "AFTERNOON",
                  afternoonCand.name(),
                  costEst.totalVnd,
                  afternoonCand.categoryName(),
                  afternoonCand.name() + " — Điểm đến văn hóa / trải nghiệm chiều tà thuận đường di chuyển.",
                  "Khám phá chiều sâu bản địa và ngắm cảnh chiều tà trong không gian thoáng đãng.",
                  "Khung giờ chiều (" + actStart.format(TIME_FMT) + " – " + actEnd.format(TIME_FMT) + ") nắng đã dịu hẳn, gió mát mẻ, rất thích hợp check-in và tản bộ thư thái.",
                  "Nơi lưu giữ nét văn hóa độc đáo và tạo cảm giác thư giãn sau chặng đường dài.",
                  actStart.format(TIME_FMT),
                  actEnd.format(TIME_FMT),
                  visitDuration,
                  transit.durationMinutes(),
                  transit.bufferMinutes(),
                  costEst.costStatus,
                  warning));

          previousDest = afternoonCand;
          currentTimeCursor = actEnd.plusMinutes(transit.bufferMinutes());
        }
      }

      // 4. CHẶNG BUỔI TỐI: PHỐ ĐÊM, CHỢ ĐÊM, CẢNH ĐÊM (Nếu ngày chưa kết thúc trước 18:30)
      if (currentTimeCursor.isBefore(dayLatestEnd.minusMinutes(45)) && dayLatestEnd.isAfter(LocalTime.of(18, 30))) {
        LocalTime eveningStart = currentTimeCursor.isBefore(LocalTime.of(18, 30)) ? LocalTime.of(18, 30) : currentTimeCursor;
        DestinationSummary eveningCand =
            findBestCandidate(
                pool,
                usedDestinationIds,
                daySelectedDests,
                "EVENING",
                previousDest,
                dayOfWeek,
                eveningStart,
                userInterests,
                userLovesHistory,
                intent);

        if (eveningCand != null) {
          int visitDuration = 90;
          TransitCalculator.TransitInfo transit =
              TransitCalculator.estimateTransit(
                  previousDest != null ? previousDest.latitude() : null,
                  previousDest != null ? previousDest.longitude() : null,
                  eveningCand.latitude(),
                  eveningCand.longitude(),
                  travelMode,
                  pace,
                  travelWith);

          LocalTime actStart = eveningStart.plusMinutes(transit.durationMinutes());
          LocalTime actEnd = actStart.plusMinutes(visitDuration);
          if (actEnd.isAfter(dayLatestEnd)) actEnd = dayLatestEnd;

          CostEstimation costEst = evaluateCost(eveningCand, people);
          if ("UNVERIFIED".equals(costEst.costStatus)) unverifiedCosts++;
          totalSightseeing = totalSightseeing.add(costEst.totalVnd);
          totalTransit = totalTransit.add(transit.estimatedFareVnd());

          usedDestinationIds.add(eveningCand.id());
          daySelectedDests.add(eveningCand);

          dayActivities.add(
              new SuggestedActivityResponse(
                  eveningCand.id(),
                  "EVENING",
                  eveningCand.name(),
                  costEst.totalVnd,
                  eveningCand.categoryName(),
                  eveningCand.name() + " — Khám phá nhịp sống đêm rực rỡ và ẩm thực đường phố.",
                  "Hòa mình vào không khí sôi động về đêm và dạo mát ngắm cảnh lung linh.",
                  "Buổi tối (" + actStart.format(TIME_FMT) + " – " + actEnd.format(TIME_FMT) + ") phố lên đèn rực rỡ, gió mát mẻ, hoàn hảo để dạo bộ thư giãn sau ngày dài.",
                  "Không gian lung linh, tấp nập người dân và du khách, nhiều món ăn vặt đặc sắc.",
                  actStart.format(TIME_FMT),
                  actEnd.format(TIME_FMT),
                  visitDuration,
                  transit.durationMinutes(),
                  transit.bufferMinutes(),
                  costEst.costStatus,
                  null));
        }
      }

      String dayTheme = switch (dayNum) {
        case 1 -> "Ngày 1 — Khởi động & Danh thắng Cốt lõi";
        case 2 -> "Ngày 2 — Chiều sâu Văn hóa & Làng nghề Bản địa";
        case 3 -> "Ngày 3 — Cảnh quan Thiên nhiên & Thư giãn";
        default -> "Ngày " + dayNum + " — Trải nghiệm mở rộng";
      };

      if (!dayActivities.isEmpty()) {
        scheduledDays.add(new SuggestedDayResponse(dayNum, dateLabel + " — " + dayTheme, dayActivities));
      }
    }

    BigDecimal grandTotal = totalSightseeing.add(totalDining).add(totalTransit);
    boolean budgetFeasible = budgetVnd == null || grandTotal.compareTo(budgetVnd) <= 0;

    String strategicRationale =
        String.format(
            "Cung đường được lập trình theo trục hướng tâm liền kề bằng phương tiện %s, hạn chế tối đa việc quay đầu xe, giúp tiết kiệm chi phí di chuyển và giữ thể lực thoải mái nhất cho cả đoàn.",
            travelMode.toLowerCase(Locale.ROOT));

    String companionRationale;
    if (intent.hasElderly()) {
      companionRationale = String.format(
          "Thiết kế tối ưu thể lực cho đoàn %d người có Người lớn tuổi: Chọn lọc các điểm bằng phẳng, thoáng mát, hạn chế leo bậc thang cao; nhịp độ %s thảnh thơi với thời gian nghỉ đệm 25–30 phút.",
          people, pace.toLowerCase(Locale.ROOT));
    } else if (intent.hasChildren()) {
      companionRationale = String.format(
          "Thiết kế an toàn và thoải mái cho đoàn %d người có Trẻ nhỏ: Ưu tiên không gian rộng rãi, sinh thái nhẹ nhàng và nghỉ trưa mát mẻ tránh nắng gắt.",
          people);
    } else {
      companionRationale = String.format(
          "Thiết kế riêng cho %d người (%s) với nhịp độ %s: Mỗi chặng di chuyển có đệm nghỉ ngơi hợp lý, các hoạt động ngoài trời xếp vào buổi sáng và chiều dịu mát.",
          people, travelWith, pace.toLowerCase(Locale.ROOT));
    }

    String budgetRationale =
        String.format(
            "Minh bạch tài chính cho đoàn %d người: Vé tham quan ước tính %,dđ, Ăn uống đặc sản %,dđ, Di chuyển %,dđ. Tổng dự kiến: %,dđ (%s ngân sách).",
            people,
            totalSightseeing.longValue(),
            totalDining.longValue(),
            totalTransit.longValue(),
            grandTotal.longValue(),
            budgetFeasible ? "Nằm trong giới hạn" : "Cần lưu ý vượt mức");

    String pacingSummary =
        String.format("Nhịp độ %s: Thời gian chuyển tiếp giữa các điểm có đệm dự phòng 15–30 phút, đảm bảo không bị hối thúc.", pace.toLowerCase(Locale.ROOT));

    String localAdvice =
        "Nên đặt trước vé các điểm du lịch lớn trực tuyến để không phải xếp hàng chờ đợi, đồng thời mang theo trang phục lịch sự khi ghé thăm các công trình di sản văn hóa tâm linh.";

    return new ScheduledPlanResult(
        scheduledDays,
        totalSightseeing,
        totalDining,
        totalTransit,
        grandTotal,
        budgetFeasible,
        unverifiedCosts,
        strategicRationale,
        companionRationale,
        budgetRationale,
        pacingSummary,
        localAdvice);
  }

  // --- HELPER LOGIC CHO SELECTION & EVALUATION ---

  private record CostEstimation(BigDecimal totalVnd, String costStatus) {}

  private static CostEstimation evaluateCost(DestinationSummary dest, int peopleCount) {
    if (dest == null || dest.priceMin() == null) {
      return new CostEstimation(BigDecimal.ZERO, "UNVERIFIED");
    }
    if (dest.priceMin().compareTo(BigDecimal.ZERO) == 0) {
      return new CostEstimation(BigDecimal.ZERO, "FREE");
    }
    BigDecimal perPerson = dest.priceMin();
    BigDecimal total = perPerson.multiply(BigDecimal.valueOf(peopleCount));
    return new CostEstimation(total, "PAID");
  }

  private static int determineVisitDuration(DestinationSummary d) {
    if (d == null) return 60;
    String text = ((d.name() != null ? d.name() : "") + " " + (d.categoryName() != null ? d.categoryName() : "")).toLowerCase(Locale.ROOT);
    if (text.contains("bà nà") || text.contains("vinpearl") || text.contains("cù lao")) return 180;
    if (text.contains("lăng") || text.contains("đại nội") || text.contains("bảo tàng") || text.contains("phố cổ")) return 120;
    if (text.contains("chùa") || text.contains("làng hương") || text.contains("thác") || text.contains("động")) return 75;
    if (text.contains("cầu") || text.contains("đồi") || text.contains("quốc học")) return 45;
    return 60;
  }

  private static DestinationSummary findBestCandidate(
      List<DestinationSummary> pool,
      Set<UUID> usedIds,
      List<DestinationSummary> daySelectedDests,
      String timeSlot,
      DestinationSummary prev,
      DayOfWeek dayOfWeek,
      LocalTime targetTime,
      List<String> userInterests,
      boolean userLovesHistory,
      SemanticIntentExtractor.TravelIntent intent) {

    DestinationSummary best = null;
    double bestScore = Double.MAX_VALUE;

    for (DestinationSummary cand : pool) {
      if (usedIds.contains(cand.id())) {
        continue; // Bất biến bắt buộc: Không bao giờ trùng lặp cùng 1 địa điểm trong chuyến đi
      }

      // Kiểm tra giờ mở cửa thực tế
      OpeningHoursHelper.ScheduleWindow window =
          OpeningHoursHelper.parseWindow(cand.openingHours(), dayOfWeek);
      if (window.isVerified()) {
        if (!window.isOpen()) {
          continue; // Đóng cửa vào ngày này -> BỎ QUA NGAY LẬP TỨC
        }
        if (window.closeTime() != null && targetTime.isAfter(window.closeTime())) {
          continue; // Đã quá giờ mở cửa -> BỎ QUA
        }
      }

      double score = 0.0;

      // Kiểm tra trùng tiểu loại di tích (chỉ phạt nếu người dùng KHÔNG yêu cầu chuyên sâu lịch sử)
      if (!userLovesHistory && hasSubcategoryRepetition(daySelectedDests, cand)) {
        score += 800.0; // Phạt nặng nếu cùng 1 ngày xếp 2 lăng hoặc 2 chùa khi không có yêu cầu đặc biệt
      }

      // Đánh giá thể lực & đối tượng đoàn (Người lớn tuổi / Trẻ nhỏ)
      if (intent != null && (intent.hasElderly() || intent.avoidStrenuousActivity())) {
        SemanticIntentExtractor.PhysicalIntensity intensity =
            SemanticIntentExtractor.evaluatePhysicalIntensity(cand);
        if (intensity == SemanticIntentExtractor.PhysicalIntensity.HIGH) {
          score += 650.0; // Phạt nặng các điểm leo núi/bậc thang dốc đối với đoàn có người lớn tuổi
        } else if (intensity == SemanticIntentExtractor.PhysicalIntensity.LOW) {
          score -= 45.0;  // Ưu tiên điểm nhẹ nhàng, bằng phẳng, có chỗ ngồi nghỉ
        }
      }

      // Khớp sở thích / từ khóa ưu tiên
      String candNorm = SemanticIntentExtractor.normalizeAscii(
          (cand.name() != null ? cand.name() : "") + " " + (cand.categoryName() != null ? cand.categoryName() : ""));
      if (intent != null && !intent.preferredKeywords().isEmpty()) {
        for (String pref : intent.preferredKeywords()) {
          if (candNorm.contains(SemanticIntentExtractor.normalizeAscii(pref))) {
            score -= 50.0;
          }
        }
      }
      if (userInterests != null) {
        for (String interest : userInterests) {
          String normInterest = SemanticIntentExtractor.normalizeAscii(interest);
          if (!normInterest.isEmpty() && candNorm.contains(normInterest)) {
            score -= 25.0;
          }
        }
      }

      // Khung giờ sinh học & thời tiết
      score += evaluateTimeSlotFit(cand, timeSlot);

      // Cự ly di chuyển từ điểm trước (nếu có)
      if (prev != null && prev.latitude() != null && prev.longitude() != null && cand.latitude() != null && cand.longitude() != null) {
        double distKm = TransitCalculator.haversineDistanceKm(prev.latitude(), prev.longitude(), cand.latitude(), cand.longitude());
        score += distKm * 3.0; // Ưu tiên các điểm gần nhau, tránh đi vòng
      }

      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    return best;
  }

  private static DestinationSummary findCulinaryCandidate(
      List<DestinationSummary> pool, Set<UUID> usedIds, DestinationSummary prev, DayOfWeek dayOfWeek) {
    DestinationSummary best = null;
    double bestDist = Double.MAX_VALUE;

    for (DestinationSummary cand : pool) {
      if (usedIds.contains(cand.id())) continue;
      String text = ((cand.name() != null ? cand.name() : "") + " " + (cand.categoryName() != null ? cand.categoryName() : "")).toLowerCase(Locale.ROOT);
      boolean isFood = text.contains("ẩm thực") || text.contains("chợ") || text.contains("quán") || text.contains("bún") || text.contains("cơm") || text.contains("bánh");
      if (!isFood) continue;

      OpeningHoursHelper.ScheduleWindow window = OpeningHoursHelper.parseWindow(cand.openingHours(), dayOfWeek);
      if (window.isVerified() && !window.isOpen()) continue;

      double dist = 10.0;
      if (prev != null && prev.latitude() != null && cand.latitude() != null) {
        dist = TransitCalculator.haversineDistanceKm(prev.latitude(), prev.longitude(), cand.latitude(), cand.longitude());
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
    return best;
  }

  private static double evaluateTimeSlotFit(DestinationSummary cand, String slot) {
    String text = ((cand.name() != null ? cand.name() : "") + " " + (cand.categoryName() != null ? cand.categoryName() : "")).toLowerCase(Locale.ROOT);
    boolean isPassOrMountain = text.contains("đèo") || text.contains("núi") || text.contains("phượt");
    boolean isBeach = text.contains("biển") || text.contains("bãi");
    boolean isCultureOrMuseum = text.contains("di tích") || text.contains("bảo tàng") || text.contains("lăng") || text.contains("chùa");
    boolean isNightSpot = text.contains("cầu") || text.contains("đêm") || text.contains("phố") || text.contains("du thuyền");

    return switch (slot) {
      case "MORNING" -> {
        if (isPassOrMountain) yield -20.0;
        if (isCultureOrMuseum) yield -10.0;
        if (isNightSpot) yield 40.0;
        yield 0.0;
      }
      case "NOON" -> 30.0;
      case "AFTERNOON" -> {
        if (isBeach) yield -15.0;
        if (isCultureOrMuseum) yield -10.0;
        if (isPassOrMountain) yield 35.0;
        yield 0.0;
      }
      case "EVENING" -> {
        if (isNightSpot) yield -25.0;
        if (isPassOrMountain) yield 60.0;
        yield 0.0;
      }
      default -> 0.0;
    };
  }

  private static final List<String> RESTRICTED_KEYWORDS = List.of(
      "lăng", "chùa", "bãi biển", "biển", "động", "thác", "bảo tàng", "núi", "đèo"
  );

  private static boolean hasSubcategoryRepetition(List<DestinationSummary> chosenSoFar, DestinationSummary cand) {
    if (chosenSoFar == null || cand == null || cand.name() == null) return false;
    String candName = cand.name().toLowerCase(Locale.ROOT);
    for (DestinationSummary already : chosenSoFar) {
      if (already == null || already.name() == null) continue;
      String alreadyName = already.name().toLowerCase(Locale.ROOT);
      for (String kw : RESTRICTED_KEYWORDS) {
        if (alreadyName.contains(kw) && candName.contains(kw)) {
          return true;
        }
      }
    }
    return false;
  }

  private static boolean isHistoryFocused(List<String> interests, String specialRequests) {
    String joined = ((interests != null ? String.join(" ", interests) : "") + " " + (specialRequests != null ? specialRequests : "")).toLowerCase(Locale.ROOT);
    return joined.contains("lịch sử") || joined.contains("văn hóa") || joined.contains("di tích") || joined.contains("lăng") || joined.contains("triều nguyễn");
  }

  private static LocalDate parseStartDate(String s) {
    if (s != null && !s.isBlank()) {
      try {
        return LocalDate.parse(s.trim());
      } catch (Exception ignored) {}
    }
    return LocalDate.now().plusDays(1);
  }

  private static String formatDateLabel(LocalDate date) {
    return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
  }
}

