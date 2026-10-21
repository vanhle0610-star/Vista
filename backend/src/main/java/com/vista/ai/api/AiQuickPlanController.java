package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.client.AiClientWrapper;
import com.vista.ai.util.AiResponseValidator;
import com.vista.ai.util.PromptBuilder;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Quick Plan", description = "Trợ lý AI tạo lịch trình nhanh cho khách vãng lai và người dùng (TV4)")
@CrossOrigin(origins = "*")
public class AiQuickPlanController {

  private static final Logger log = LoggerFactory.getLogger(AiQuickPlanController.class);

  private final AiClientWrapper aiClientWrapper;

  @Autowired
  public AiQuickPlanController(AiClientWrapper aiClientWrapper) {
    this.aiClientWrapper = aiClientWrapper;
  }

  @PostMapping("/quick-plan")
  @Operation(summary = "Yêu cầu AI lập lịch trình du lịch nhanh không cần tạo trước chuyến đi")
  public ResponseEntity<AiItinerarySuggestionResponse> generateQuickPlan(
      @Valid @RequestBody AiItinerarySuggestionRequest request) {

    int daysCount = request.totalDays() != null ? request.totalDays() : 3;
    BigDecimal budgetVnd = calculateBudgetVnd(request.budgetLevel(), daysCount);

    if (aiClientWrapper != null && aiClientWrapper.isAvailable()) {
      try {
        PromptBuilder.PlanRequest planRequest =
            new PromptBuilder.PlanRequest(
                request.destinationProvince(),
                daysCount,
                budgetVnd,
                4,
                request.interests() != null ? request.interests() : List.of("Khám phá", "Ẩm thực", "Nghỉ dưỡng"),
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

          log.info("Quick plan generated successfully via Gemini for: {}", request.destinationProvince());
          return ResponseEntity.ok(
              new AiItinerarySuggestionResponse(
                  request.destinationProvince(),
                  daysCount,
                  request.budgetLevel(),
                  estimatedTotal,
                  false,
                  days));
        }
      } catch (Exception ex) {
        log.warn("Gemini quick-plan failed, falling back gracefully: {}", ex.getMessage());
      }
    }

    return ResponseEntity.ok(generateFallbackResponse(request, daysCount, budgetVnd));
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

  private List<SuggestedDayResponse> parseSuggestedDays(JsonNode root) {
    List<SuggestedDayResponse> days = new ArrayList<>();
    JsonNode daysNode = root.get("days");
    if (daysNode != null && daysNode.isArray()) {
      for (JsonNode dayNode : daysNode) {
        int dayNum = dayNode.has("dayNumber") ? dayNode.get("dayNumber").asInt() : (days.size() + 1);
        String title = dayNode.has("title") ? dayNode.get("title").asText() : ("Ngày " + dayNum);
        List<SuggestedActivityResponse> activities = new ArrayList<>();

        JsonNode activitiesNode = dayNode.get("activities");
        if (activitiesNode != null && activitiesNode.isArray()) {
          for (JsonNode actNode : activitiesNode) {
            String timeSlot = actNode.has("timeSlot") ? actNode.get("timeSlot").asText() : "MORNING";
            String placeName = actNode.has("placeName") ? actNode.get("placeName").asText() : "Điểm tham quan";
            String note = actNode.has("activityDescription") ? actNode.get("activityDescription").asText() : "";
            BigDecimal cost =
                actNode.has("estimatedCostVnd") && actNode.get("estimatedCostVnd").isNumber()
                    ? BigDecimal.valueOf(actNode.get("estimatedCostVnd").asLong())
                    : BigDecimal.valueOf(180000);

            activities.add(
                new SuggestedActivityResponse(
                    UUID.randomUUID(),
                    timeSlot,
                    placeName,
                    cost,
                    "Tham quan & Trải nghiệm",
                    note));
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
                  "Khám phá danh thắng & ngắm bình minh (" + request.destinationProvince() + ")",
                  BigDecimal.valueOf(150000),
                  "Cảnh quan & Văn hóa",
                  "Khởi đầu ngày mới với không khí trong lành và chụp ảnh lưu niệm"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "AFTERNOON",
                  "Trải nghiệm ẩm thực địa phương & Thư giãn",
                  BigDecimal.valueOf(250000),
                  "Ẩm thực đặc sản",
                  "Thưởng thức các món ăn nức tiếng và cà phê ngắm phố"),
              new SuggestedActivityResponse(
                  UUID.randomUUID(),
                  "EVENING",
                  "Phố đêm, chợ đêm & Check-in lung linh",
                  BigDecimal.valueOf(400000),
                  "Giải trí & Chợ đêm",
                  "Hòa mình vào nhịp sống về đêm và mua sắm quà lưu niệm"));

      suggestedDays.add(new SuggestedDayResponse(day, "Ngày " + day + " — Khám phá & Trải nghiệm", activities));
    }

    return new AiItinerarySuggestionResponse(
        request.destinationProvince(),
        daysCount,
        request.budgetLevel(),
        budgetVnd,
        true,
        suggestedDays);
  }
}
