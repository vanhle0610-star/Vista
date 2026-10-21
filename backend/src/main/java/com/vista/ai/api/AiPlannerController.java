package com.vista.ai.api;

import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.api.dto.RouteOptimizationRequest;
import com.vista.ai.api.dto.RouteOptimizationResponse;
import com.vista.ai.config.AiRateLimiter;
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
import java.util.UUID;
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

  private final TripAccessService tripAccessService;
  private final CurrentUserProvider currentUserProvider;
  private final AiRateLimiter aiRateLimiter;

  public AiPlannerController(
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider,
      AiRateLimiter aiRateLimiter) {
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
    this.aiRateLimiter = aiRateLimiter;
  }

  @PostMapping("/itinerary-suggestions")
  @Operation(summary = "Yêu cầu AI gợi ý lịch trình và ước tính chi phí chuyến đi (v0 Mock Schema)")
  public ResponseEntity<AiItinerarySuggestionResponse> getItinerarySuggestions(
      @PathVariable UUID tripId, @Valid @RequestBody AiItinerarySuggestionRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);

    // Kiểm tra và tiêu hao hạn ngạch AI (Tối đa 5 lượt/ngày/user theo Quyết định D5)
    aiRateLimiter.checkAndConsume(currentUserId);

    int daysCount = request.totalDays() != null ? request.totalDays() : 3;
    List<SuggestedDayResponse> suggestedDays = new ArrayList<>();

    for (int day = 1; day <= daysCount; day++) {
      List<SuggestedActivityResponse> activities =
          List.of(
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "MORNING",
                  "Bán đảo Sơn Trà & Chùa Linh Ứng",
                  BigDecimal.valueOf(150000),
                  "Tâm linh & Cảnh quan",
                  "Ngắm bình minh và tượng Phật Bà Quan Âm"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "AFTERNOON",
                  "Bãi biển Mỹ Khê",
                  BigDecimal.valueOf(250000),
                  "Biển & Thư giãn",
                  "Tắm biển và thưởng thức dừa tươi"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "EVENING",
                  "Cầu Rồng & Chợ đêm Sơn Trà",
                  BigDecimal.valueOf(400000),
                  "Ẩm thực & Check-in",
                  "Xem Cầu Rồng phun lửa và ăn hải sản đêm"));

      suggestedDays.add(new SuggestedDayResponse(day, "Ngày " + day, activities));
    }

    BigDecimal totalEstimated = BigDecimal.valueOf(800000).multiply(BigDecimal.valueOf(daysCount));

    AiItinerarySuggestionResponse response =
        new AiItinerarySuggestionResponse(
            request.destinationProvince(),
            daysCount,
            request.budgetLevel(),
            totalEstimated,
            true,
            suggestedDays);

    return ResponseEntity.ok(response);
  }

  @PostMapping("/optimize-route")
  @Operation(summary = "Tối ưu hóa thứ tự các điểm đến bằng thuật toán Nearest Neighbor TSP (BF-02)")
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
}
