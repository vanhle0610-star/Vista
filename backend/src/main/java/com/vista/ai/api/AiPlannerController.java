package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.api.dto.RouteOptimizationRequest;
import com.vista.ai.api.dto.RouteOptimizationResponse;
import com.vista.ai.client.AiClientWrapper;
import com.vista.ai.config.AiRateLimiter;
import com.vista.ai.util.AiResponseValidator;
import com.vista.ai.util.PromptBuilder;
import com.vista.budget.util.RouteOptimizer;
import com.vista.common.security.CurrentUserProvider;
import com.vista.trip.application.TripAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/ai")
@Tag(name = "AI Planner", description = "Trợ lý AI gợi ý lịch trình chuyến đi (BF-02, TV4)")
@SecurityRequirement(name = "bearerAuth")
public class AiPlannerController {

  private static final Logger log = LoggerFactory.getLogger(AiPlannerController.class);

  private final TripAccessService tripAccessService;
  private final CurrentUserProvider currentUserProvider;
  private final AiRateLimiter aiRateLimiter;
  private final AiClientWrapper aiClientWrapper;

  @Autowired
  public AiPlannerController(
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider,
      AiRateLimiter aiRateLimiter,
      AiClientWrapper aiClientWrapper) {
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
    this.aiRateLimiter = aiRateLimiter;
    this.aiClientWrapper = aiClientWrapper;
  }

  @PostMapping("/itinerary-suggestions")
  @Operation(
      summary =
          "Yêu cầu AI gợi ý lịch trình và ước tính chi phí chuyến đi (Google Gemini LLM / Fallback)")
  public ResponseEntity<AiItinerarySuggestionResponse> getItinerarySuggestions(
      @PathVariable UUID tripId, @Valid @RequestBody AiItinerarySuggestionRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);

    // 1. Kiểm tra và tiêu hao hạn ngạch AI (Tối đa 5 lượt/ngày/user theo Quyết định D5)
    aiRateLimiter.checkAndConsume(currentUserId);

    int daysCount = request.totalDays() != null ? request.totalDays() : 3;

    // 2. Tính ngân sách dự kiến ước lượng (VND) theo budgetLevel
    BigDecimal budgetVnd = calculateBudgetVnd(request.budgetLevel(), daysCount);

    // 3. Thử gọi mô hình Live Google Gemini LLM nếu khả dụng
    if (aiClientWrapper != null && aiClientWrapper.isAvailable()) {
      try {
        PromptBuilder.PlanRequest planRequest =
            new PromptBuilder.PlanRequest(
                request.destinationProvince(),
                daysCount,
                budgetVnd,
                4, // Số thành viên mặc định
                request.interests() != null
                    ? request.interests()
                    : List.of("Khám phá", "Ẩm thực", "Văn hóa"),
                List.of());

        String prompt = PromptBuilder.buildUserPrompt(planRequest);
        Optional<String> rawAiResponse = aiClientWrapper.generateContent(prompt);

        if (rawAiResponse.isPresent()) {
          JsonNode parsed = AiResponseValidator.validateAndParseItinerary(rawAiResponse.get());
          List<SuggestedDayResponse> days = parseSuggestedDays(parsed);

          BigDecimal estimatedTotal =
              parsed.has("estimatedTotalVnd") && parsed.get("estimatedTotalVnd").isNumber()
                  ? BigDecimal.valueOf(parsed.get("estimatedTotalVnd").asLong())
                  : budgetVnd;

          log.info("Successfully generated itinerary via Gemini LLM for tripId: {}", tripId);
          return ResponseEntity.ok(
              new AiItinerarySuggestionResponse(
                  request.destinationProvince(),
                  daysCount,
                  request.budgetLevel(),
                  estimatedTotal,
                  false, // Dữ liệu thật từ Live AI
                  days));
        }
      } catch (Exception ex) {
        log.warn(
            "Gemini AI invocation failed or returned invalid JSON. Falling back to deterministic plan: {}",
            ex.getMessage());
      }
    }

    // 4. Fallback an toàn (Graceful Degradation): sinh kế hoạch mẫu chất lượng cao, không bao giờ
    // để lỗi 500
    log.info("Generating deterministic fallback itinerary for tripId: {}", tripId);
    return ResponseEntity.ok(generateFallbackResponse(request, daysCount, budgetVnd));
  }

  @PostMapping("/optimize-route")
  @Operation(
      summary = "Tối ưu hóa thứ tự các điểm đến bằng thuật toán Nearest Neighbor TSP (BF-02)")
  public ResponseEntity<RouteOptimizationResponse> optimizeRoute(
      @PathVariable UUID tripId, @Valid @RequestBody RouteOptimizationRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);

    RouteOptimizer.OptimizationResult result =
        RouteOptimizer.optimizeRoute(request.startPoint(), request.destinations());

    return ResponseEntity.ok(
        new RouteOptimizationResponse(
            result.orderedRoute(), result.totalDistanceKm(), result.estimatedTaxiCostVnd()));
  }

  // ─── HELPER METHODS ─────────────────────────────────────────────────────────

  private BigDecimal calculateBudgetVnd(String budgetLevel, int daysCount) {
    if (budgetLevel == null) {
      return BigDecimal.valueOf(1200000L * daysCount);
    }
    return switch (budgetLevel.trim().toUpperCase()) {
      case "BUDGET", "TIET_KIEM", "LOW" -> BigDecimal.valueOf(600000L * daysCount);
      case "LUXURY", "SANG_TRONG", "HIGH" -> BigDecimal.valueOf(3000000L * daysCount);
      default -> BigDecimal.valueOf(1400000L * daysCount); // MEDIUM / TIÊU CHUẨN
    };
  }

  private List<SuggestedDayResponse> parseSuggestedDays(JsonNode root) {
    List<SuggestedDayResponse> days = new ArrayList<>();
    JsonNode daysNode = root.get("days");
    if (daysNode != null && daysNode.isArray()) {
      for (JsonNode dayNode : daysNode) {
        int dayNum =
            dayNode.has("dayNumber") ? dayNode.get("dayNumber").asInt() : (days.size() + 1);
        String title = dayNode.has("title") ? dayNode.get("title").asText() : ("Ngày " + dayNum);
        List<SuggestedActivityResponse> activities = new ArrayList<>();

        JsonNode activitiesNode = dayNode.get("activities");
        if (activitiesNode != null && activitiesNode.isArray()) {
          for (JsonNode actNode : activitiesNode) {
            String timeSlot =
                actNode.has("timeSlot") ? actNode.get("timeSlot").asText() : "MORNING";
            String placeName =
                actNode.has("placeName") ? actNode.get("placeName").asText() : "Địa điểm du lịch";
            String note =
                actNode.has("activityDescription")
                    ? actNode.get("activityDescription").asText()
                    : "";
            BigDecimal cost =
                actNode.has("estimatedCostVnd") && actNode.get("estimatedCostVnd").isNumber()
                    ? BigDecimal.valueOf(actNode.get("estimatedCostVnd").asLong())
                    : BigDecimal.valueOf(180000);

            activities.add(
                new SuggestedActivityResponse(
                    UUID.randomUUID(), timeSlot, placeName, cost, "Tham quan & Trải nghiệm", note));
          }
        }
        days.add(new SuggestedDayResponse(dayNum, title, activities));
      }
    }
    return days;
  }

  private AiItinerarySuggestionResponse generateFallbackResponse(
      AiItinerarySuggestionRequest request, int daysCount, BigDecimal budgetVnd) {
    List<SuggestedDayResponse> suggestedDays = new ArrayList<>();

    for (int day = 1; day <= daysCount; day++) {
      List<SuggestedActivityResponse> activities =
          List.of(
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "MORNING",
                  "Bán đảo Sơn Trà & Chùa Linh Ứng (" + request.destinationProvince() + ")",
                  BigDecimal.valueOf(150000),
                  "Tâm linh & Cảnh quan",
                  "Ngắm bình minh biển và tượng Phật Bà Quan Âm"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "AFTERNOON",
                  "Bãi biển Mỹ Khê & Vui chơi lướt ván",
                  BigDecimal.valueOf(250000),
                  "Biển & Thư giãn",
                  "Tắm biển, thưởng thức dừa tươi và hải sản tươi ngon"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "EVENING",
                  "Cầu Rồng, Cầu Tình Yêu & Phố ẩm thực đêm",
                  BigDecimal.valueOf(400000),
                  "Ẩm thực & Check-in",
                  "Xem Cầu Rồng phun lửa nước và khám phá ẩm thực đường phố"));

      suggestedDays.add(
          new SuggestedDayResponse(day, "Ngày " + day + " — Khám phá & Trải nghiệm", activities));
    }

    return new AiItinerarySuggestionResponse(
        request.destinationProvince(),
        daysCount,
        request.budgetLevel(),
        budgetVnd,
        true, // Đánh dấu là fallback template
        suggestedDays);
  }
}
