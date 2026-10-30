package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.api.dto.RouteOptimizationRequest;
import com.vista.ai.api.dto.RouteOptimizationResponse;
import com.vista.ai.config.AiRateLimiter;
import com.vista.ai.provider.AiProviderRouter;
import com.vista.ai.rag.RagRetrievalService;
import com.vista.ai.rag.RagRetrievalService.RagHit;
import com.vista.ai.scheduler.SemanticIntentExtractor;
import com.vista.ai.scheduler.TravelScheduler;
import com.vista.ai.util.AiResponseValidator;
import com.vista.ai.util.PromptBuilder;
import com.vista.budget.util.RouteOptimizer;
import com.vista.common.audit.AuditLogService;
import com.vista.common.security.CurrentUserProvider;
import com.vista.destination.application.DestinationSummary;
import com.vista.trip.application.TripAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
  private final AiProviderRouter aiProviderRouter;
  private final AuditLogService auditLogService;
  private final com.vista.destination.application.DestinationQueryService destinationQueryService;
  private final RagRetrievalService ragRetrievalService;

  @Autowired
  public AiPlannerController(
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider,
      AiRateLimiter aiRateLimiter,
      AiProviderRouter aiProviderRouter,
      AuditLogService auditLogService,
      @Autowired(required = false)
          com.vista.destination.application.DestinationQueryService destinationQueryService,
      Optional<RagRetrievalService> ragRetrievalService) {
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
    this.aiRateLimiter = aiRateLimiter;
    this.aiProviderRouter = aiProviderRouter;
    this.auditLogService = auditLogService;
    this.destinationQueryService = destinationQueryService;
    this.ragRetrievalService = ragRetrievalService.orElse(null);
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

    // 3. Ghi nhận audit metadata an toàn (không log raw prompt/response/API key)
    auditLogService.logAction(
        currentUserId,
        "AI_PLAN_GENERATE",
        "TRIP",
        tripId.toString(),
        String.format(
            "{\"destinationProvince\":\"%s\",\"daysCount\":%d,\"budgetLevel\":\"%s\"}",
            request.destinationProvince() != null ? request.destinationProvince() : "",
            daysCount,
            request.budgetLevel() != null ? request.budgetLevel() : "MEDIUM"));

    // 4. Lấy số thành viên thật của chuyến đi & các địa điểm PUBLISHED
    int membersCount = Math.max(1, tripAccessService.getActiveMemberCount(tripId));
    List<DestinationSummary> publishedDestinations = List.of();
    if (destinationQueryService != null && request.destinationProvince() != null) {
      try {
        publishedDestinations =
            destinationQueryService.searchPublished(
                null, request.destinationProvince(), null, budgetVnd, 30);
      } catch (Exception e) {
        log.warn("Could not query published destinations: {}", e.getClass().getSimpleName());
      }
    }
    if (publishedDestinations.isEmpty()) {
      throw new IllegalArgumentException(
          "Không có địa điểm PUBLISHED phù hợp; hệ thống từ chối tạo dữ liệu giả");
    }

    List<RagHit> ragHits =
        ragRetrievalService == null
            ? List.of()
            : ragRetrievalService.search(
                String.join(" ", request.interests() == null ? List.of() : request.interests()),
                request.destinationProvince(),
                15);
    if (!ragHits.isEmpty()) {
      List<UUID> ragDestinationIds = ragHits.stream().map(RagHit::sourceId).distinct().toList();
      Map<UUID, DestinationSummary> merged = new LinkedHashMap<>();
      publishedDestinations.forEach(item -> merged.put(item.id(), item));
      destinationQueryService
          .findPublishedByIds(ragDestinationIds)
          .forEach(item -> merged.put(item.id(), item));
      publishedDestinations = new ArrayList<>(merged.values());
    }

    Map<UUID, DestinationSummary> allowedDestinations = new LinkedHashMap<>();
    publishedDestinations.forEach(item -> allowedDestinations.put(item.id(), item));
    List<String> groundedCatalogue =
        publishedDestinations.stream().map(this::toPromptCatalogueLine).toList();

    SemanticIntentExtractor.TravelIntent intent = SemanticIntentExtractor.extractIntent(request);

    // 5. Gọi provider đã được chọn rõ ràng; không tự ý gửi dữ liệu sang Gemini.
    if (aiProviderRouter != null && aiProviderRouter.isAvailable()) {
      try {
        int members =
            request.peopleCount() != null && request.peopleCount() > 0
                ? request.peopleCount()
                : membersCount;
        String travelWith = request.travelWith() != null ? request.travelWith() : "Nhóm bạn";

        PromptBuilder.PlanRequest planRequest =
            new PromptBuilder.PlanRequest(
                request.destinationProvince(),
                daysCount,
                budgetVnd,
                members,
                request.interests() != null
                    ? request.interests()
                    : List.of("Khám phá", "Ẩm thực", "Văn hóa"),
                groundedCatalogue,
                request.startDate(),
                travelWith,
                request.specialRequests(),
                intent.arrivalTimeFormatted(),
                intent.departureTimeFormatted(),
                intent.effectivePace(),
                intent.effectiveTravelMode(),
                intent.avoidKeywords());

        String prompt = PromptBuilder.buildUserPrompt(planRequest);
        Optional<AiProviderRouter.AiProviderResponse> providerResponse =
            aiProviderRouter.generate(PromptBuilder.buildSystemPrompt(), prompt);

        if (providerResponse.isPresent()) {
          JsonNode parsed =
              AiResponseValidator.validateAndParseItineraryWithLocalRepair(
                  providerResponse.get().content());
          List<SuggestedDayResponse> days =
              AiQuickPlanController.parseSuggestedDays(
                  parsed,
                  allowedDestinations,
                  daysCount,
                  publishedDestinations,
                  request.interests(),
                  intent.arrivalTime(),
                  intent.departureTime());
          if (days.isEmpty()) {
            throw new IllegalArgumentException(
                "AI response does not contain a complete grounded itinerary");
          }

          BigDecimal estimatedTotal =
              parsed.has("estimatedTotalVnd") && parsed.get("estimatedTotalVnd").isNumber()
                  ? BigDecimal.valueOf(parsed.get("estimatedTotalVnd").asLong())
                  : budgetVnd;

          String weatherSummary =
              parsed.has("weatherSummary") && !parsed.get("weatherSummary").asText("").isBlank()
                  ? parsed.get("weatherSummary").asText()
                  : AiQuickPlanController.generateSeasonalWeatherInsight(
                      request.destinationProvince(), request.startDate());
          String pacingSummary =
              parsed.has("pacingSummary") && !parsed.get("pacingSummary").asText("").isBlank()
                  ? parsed.get("pacingSummary").asText()
                  : AiQuickPlanController.generatePacingInsight(daysCount, request.interests());
          String localAdviceSummary =
              parsed.has("localAdviceSummary")
                      && !parsed.get("localAdviceSummary").asText("").isBlank()
                  ? parsed.get("localAdviceSummary").asText()
                  : AiQuickPlanController.generateLocalAdviceInsight(
                      request.destinationProvince(), request.budgetLevel(), request.interests());

          String strategicRationale =
              parsed.has("strategicRationale")
                      && !parsed.get("strategicRationale").asText("").isBlank()
                  ? parsed.get("strategicRationale").asText()
                  : AiQuickPlanController.generateStrategicRationale(
                      request.destinationProvince(), daysCount, travelWith, request.interests());

          String companionFitRationale =
              parsed.has("companionFitRationale")
                      && !parsed.get("companionFitRationale").asText("").isBlank()
                  ? parsed.get("companionFitRationale").asText()
                  : AiQuickPlanController.generateCompanionFitRationale(
                      members, travelWith, request.interests());

          String budgetOptimizationRationale =
              parsed.has("budgetOptimizationRationale")
                      && !parsed.get("budgetOptimizationRationale").asText("").isBlank()
                  ? parsed.get("budgetOptimizationRationale").asText()
                  : AiQuickPlanController.generateBudgetRationale(
                      request.budgetLevel(), budgetVnd, members);

          log.info(
              "Generated grounded itinerary provider={} fallbackUsed={} tripId={}",
              providerResponse.get().provider(),
              providerResponse.get().fallbackUsed(),
              tripId);
          return ResponseEntity.ok(
              new AiItinerarySuggestionResponse(
                  request.destinationProvince(),
                  daysCount,
                  request.budgetLevel(),
                  estimatedTotal,
                  false,
                  days,
                  providerResponse.get().provider(),
                  providerResponse.get().fallbackUsed(),
                  ragHits.stream()
                      .map(
                          hit ->
                              new AiItinerarySuggestionResponse.CitationResponse(
                                  "DESTINATION",
                                  hit.sourceId(),
                                  hit.title(),
                                  hit.chunkId(),
                                  "HYBRID",
                                  hit.score()))
                      .toList(),
                  weatherSummary,
                  pacingSummary,
                  localAdviceSummary,
                  strategicRationale,
                  companionFitRationale,
                  budgetOptimizationRationale));
        }
      } catch (Exception ex) {
        log.warn("AI response rejected by validation: {}", ex.getClass().getSimpleName());
      }
    }

    // 6. Degradation chỉ dùng các bản ghi PUBLISHED đã truy xuất, không sinh ID/tên giả.
    log.info("Generating grounded deterministic plan for tripId: {}", tripId);
    return ResponseEntity.ok(
        generateGroundedFallbackResponse(request, daysCount, budgetVnd, publishedDestinations));
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
      default -> BigDecimal.valueOf(1400000L * daysCount);
    };
  }

  private String toPromptCatalogueLine(DestinationSummary item) {
    return String.format(
        "%s | %s | %s | %s-%s VND",
        item.id(),
        item.name(),
        item.categoryName(),
        item.priceMin() != null ? item.priceMin().toPlainString() : "unknown",
        item.priceMax() != null ? item.priceMax().toPlainString() : "unknown");
  }

  private AiItinerarySuggestionResponse generateGroundedFallbackResponse(
      AiItinerarySuggestionRequest request,
      int daysCount,
      BigDecimal budgetVnd,
      List<DestinationSummary> destinations) {
    TravelScheduler.ScheduledPlanResult plan =
        TravelScheduler.buildDeterministicPlan(request, daysCount, budgetVnd, destinations);

    return new AiItinerarySuggestionResponse(
        request.destinationProvince(),
        daysCount,
        request.budgetLevel(),
        plan.grandTotalCost(),
        true,
        plan.days(),
        "deterministic",
        true,
        List.of(),
        AiQuickPlanController.generateSeasonalWeatherInsight(
            request.destinationProvince(), request.startDate()),
        plan.pacingSummary(),
        plan.localAdviceSummary(),
        plan.strategicRationale(),
        plan.companionFitRationale(),
        plan.budgetOptimizationRationale(),
        plan.totalSightseeingCost(),
        plan.totalDiningCost(),
        plan.totalTransitCost(),
        plan.isBudgetFeasible(),
        plan.unverifiedCostCount());
  }
}
