package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.config.AiRateLimiter;
import com.vista.ai.provider.AiProviderRouter;
import com.vista.ai.rag.RagRetrievalService;
import com.vista.ai.rag.RagRetrievalService.RagHit;
import com.vista.ai.util.AiResponseValidator;
import com.vista.ai.util.PromptBuilder;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(
    name = "AI Quick Plan",
    description = "Trợ lý AI tạo lịch trình nhanh cho khách vãng lai và người dùng (TV4)")
public class AiQuickPlanController {

  private static final Logger log = LoggerFactory.getLogger(AiQuickPlanController.class);

  private final AiProviderRouter aiProviderRouter;
  private final AiRateLimiter aiRateLimiter;
  private final DestinationQueryService destinationQueryService;
  private final RagRetrievalService ragRetrievalService;

  @Autowired
  public AiQuickPlanController(
      AiProviderRouter aiProviderRouter,
      AiRateLimiter aiRateLimiter,
      DestinationQueryService destinationQueryService,
      Optional<RagRetrievalService> ragRetrievalService) {
    this.aiProviderRouter = aiProviderRouter;
    this.aiRateLimiter = aiRateLimiter;
    this.destinationQueryService = destinationQueryService;
    this.ragRetrievalService = ragRetrievalService.orElse(null);
  }

  @PostMapping("/quick-plan")
  @Operation(summary = "Yêu cầu AI lập lịch trình du lịch nhanh không cần tạo trước chuyến đi")
  public ResponseEntity<AiItinerarySuggestionResponse> generateQuickPlan(
      @Valid @RequestBody AiItinerarySuggestionRequest request,
      jakarta.servlet.http.HttpServletRequest servletRequest) {

    // 1. Rate limit công khai theo IP & Device Identifier (chống spam Gemini không giới hạn)
    if (aiRateLimiter != null) {
      String clientIp = extractClientIp(servletRequest);
      aiRateLimiter.checkPublicRateLimit(clientIp);
    }

    // 2. Validate ràng buộc kích thước đầu vào
    if (request.destinationProvince() != null
        && request.destinationProvince().trim().length() > 100) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Tên điểm đến không được vượt quá 100 ký tự");
    }
    if (request.interests() != null) {
      if (request.interests().size() > 10) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "Số lượng sở thích tối đa là 10");
      }
      for (String interest : request.interests()) {
        if (interest != null && interest.length() > 50) {
          throw new org.springframework.web.server.ResponseStatusException(
              org.springframework.http.HttpStatus.BAD_REQUEST,
              "Độ dài mỗi sở thích tối đa là 50 ký tự");
        }
      }
    }

    int daysCount = request.totalDays() != null ? request.totalDays() : 3;
    if (daysCount <= 0 || daysCount > 14) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Số ngày lịch trình phải từ 1 đến 14 ngày");
    }
    BigDecimal budgetVnd = calculateBudgetVnd(request.budgetLevel(), daysCount);
    List<DestinationSummary> publishedDestinations =
        destinationQueryService.searchPublished(
            null, request.destinationProvince(), null, budgetVnd, 12);
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
                12);
    if (!ragHits.isEmpty()) {
      Map<UUID, DestinationSummary> merged = new LinkedHashMap<>();
      publishedDestinations.forEach(item -> merged.put(item.id(), item));
      destinationQueryService
          .findPublishedByIds(ragHits.stream().map(RagHit::sourceId).distinct().toList())
          .forEach(item -> merged.put(item.id(), item));
      publishedDestinations = new ArrayList<>(merged.values());
    }
    Map<UUID, DestinationSummary> allowedDestinations = new LinkedHashMap<>();
    publishedDestinations.forEach(item -> allowedDestinations.put(item.id(), item));
    List<String> catalogue =
        publishedDestinations.stream()
            .map(item -> item.id() + " | " + item.name() + " | " + item.categoryName())
            .toList();

    if (aiProviderRouter.isAvailable()) {
      try {
        PromptBuilder.PlanRequest planRequest =
            new PromptBuilder.PlanRequest(
                request.destinationProvince(),
                daysCount,
                budgetVnd,
                4,
                request.interests() != null
                    ? request.interests()
                    : List.of("Khám phá", "Ẩm thực", "Nghỉ dưỡng"),
                catalogue);

        String prompt = PromptBuilder.buildUserPrompt(planRequest);
        Optional<AiProviderRouter.AiProviderResponse> rawAiResponse =
            aiProviderRouter.generate(PromptBuilder.buildSystemPrompt(), prompt);

        if (rawAiResponse.isPresent()) {
          JsonNode parsed =
              AiResponseValidator.validateAndParseItineraryWithLocalRepair(
                  rawAiResponse.get().content());
          List<SuggestedDayResponse> days = parseSuggestedDays(parsed, allowedDestinations);
          if (days.size() != daysCount) {
            throw new IllegalArgumentException("Incomplete grounded itinerary");
          }

          BigDecimal estimatedTotal =
              parsed.has("estimatedTotalVnd") && parsed.get("estimatedTotalVnd").isNumber()
                  ? BigDecimal.valueOf(parsed.get("estimatedTotalVnd").asLong())
                  : budgetVnd;

          log.info(
              "Quick plan generated provider={} fallbackUsed={}",
              rawAiResponse.get().provider(),
              rawAiResponse.get().fallbackUsed());
          return ResponseEntity.ok(
              new AiItinerarySuggestionResponse(
                  request.destinationProvince(),
                  daysCount,
                  request.budgetLevel(),
                  estimatedTotal,
                  false,
                  days,
                  rawAiResponse.get().provider(),
                  rawAiResponse.get().fallbackUsed(),
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
                      .toList()));
        }
      } catch (Exception ex) {
        log.warn("Quick-plan response rejected: {}", ex.getClass().getSimpleName());
      }
    }

    return ResponseEntity.ok(
        generateGroundedFallbackResponse(request, daysCount, budgetVnd, publishedDestinations));
  }

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

  private List<SuggestedDayResponse> parseSuggestedDays(
      JsonNode root, Map<UUID, DestinationSummary> allowedDestinations) {
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
            DestinationSummary destination;
            try {
              destination =
                  allowedDestinations.get(UUID.fromString(actNode.path("destinationId").asText()));
            } catch (IllegalArgumentException exception) {
              continue;
            }
            if (destination == null) continue;
            String note =
                actNode.has("activityDescription")
                    ? actNode.get("activityDescription").asText()
                    : "";
            BigDecimal cost =
                destination.priceMin() != null ? destination.priceMin() : BigDecimal.ZERO;

            activities.add(
                new SuggestedActivityResponse(
                    destination.id(),
                    timeSlot,
                    destination.name(),
                    cost,
                    destination.categoryName(),
                    note));
          }
        }
        if (!activities.isEmpty()) {
          days.add(new SuggestedDayResponse(dayNum, title, activities));
        }
      }
    }
    return days;
  }

  private AiItinerarySuggestionResponse generateGroundedFallbackResponse(
      AiItinerarySuggestionRequest request,
      int daysCount,
      BigDecimal budgetVnd,
      List<DestinationSummary> destinations) {
    List<SuggestedDayResponse> days = new ArrayList<>();
    String[] slots = {"MORNING", "AFTERNOON", "EVENING"};
    for (int day = 1; day <= daysCount; day++) {
      List<SuggestedActivityResponse> activities = new ArrayList<>();
      for (int slot = 0; slot < slots.length; slot++) {
        DestinationSummary destination =
            destinations.get(((day - 1) * slots.length + slot) % destinations.size());
        activities.add(
            new SuggestedActivityResponse(
                destination.id(),
                slots[slot],
                destination.name(),
                destination.priceMin() != null ? destination.priceMin() : BigDecimal.ZERO,
                destination.categoryName(),
                "Phương án an toàn từ dữ liệu PUBLISHED; cần xác nhận trước khi lưu."));
      }
      days.add(
          new SuggestedDayResponse(day, "Ngày " + day + " — Phương án đã kiểm chứng", activities));
    }
    return new AiItinerarySuggestionResponse(
        request.destinationProvince(),
        daysCount,
        request.budgetLevel(),
        budgetVnd,
        true,
        days,
        "deterministic",
        true);
  }

  private String extractClientIp(jakarta.servlet.http.HttpServletRequest request) {
    if (request == null) return "unknown";
    String xForwarded = request.getHeader("X-Forwarded-For");
    if (xForwarded != null && !xForwarded.isBlank()) {
      return xForwarded.split(",")[0].trim();
    }
    String deviceId = request.getHeader("X-Device-Id");
    String remoteAddr = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    return deviceId != null ? (remoteAddr + ":" + deviceId) : remoteAddr;
  }
}
