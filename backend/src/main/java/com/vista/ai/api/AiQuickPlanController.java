package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiChatModifyRequest;
import com.vista.ai.api.dto.AiChatModifyResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.config.AiRateLimiter;
import com.vista.ai.provider.AiProviderRouter;
import com.vista.ai.rag.RagRetrievalService;
import com.vista.ai.rag.RagRetrievalService.RagHit;
import com.vista.ai.scheduler.SemanticIntentExtractor;
import com.vista.ai.scheduler.TravelScheduler;
import com.vista.ai.util.AiResponseValidator;
import com.vista.ai.util.PromptBuilder;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalTime;
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
        diversifyByCategory(
            destinationQueryService.searchPublished(
                null, request.destinationProvince(), null, budgetVnd, 30));
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

    SemanticIntentExtractor.TravelIntent intent = SemanticIntentExtractor.extractIntent(request);

    if (aiProviderRouter.isAvailable()) {
      try {
        int members = request.peopleCount() != null && request.peopleCount() > 0 ? request.peopleCount() : 2;
        String travelWith = request.travelWith() != null ? request.travelWith() : "Nhóm bạn";
        PromptBuilder.PlanRequest planRequest =
            new PromptBuilder.PlanRequest(
                request.destinationProvince(),
                daysCount,
                budgetVnd,
                members,
                request.interests() != null
                    ? request.interests()
                    : List.of("Khám phá", "Ẩm thực", "Nghỉ dưỡng"),
                catalogue,
                request.startDate(),
                travelWith,
                request.specialRequests(),
                intent.arrivalTimeFormatted(),
                intent.departureTimeFormatted(),
                intent.effectivePace(),
                intent.effectiveTravelMode(),
                intent.avoidKeywords());

        String prompt = PromptBuilder.buildUserPrompt(planRequest);
        Optional<AiProviderRouter.AiProviderResponse> rawAiResponse =
            aiProviderRouter.generate(PromptBuilder.buildSystemPrompt(), prompt);

        if (rawAiResponse.isPresent()) {
          JsonNode parsed =
              AiResponseValidator.validateAndParseItineraryWithLocalRepair(
                  rawAiResponse.get().content());
          List<SuggestedDayResponse> days =
              parseSuggestedDays(
                  parsed,
                  allowedDestinations,
                  daysCount,
                  publishedDestinations,
                  request.interests(),
                  intent.arrivalTime(),
                  intent.departureTime());
          if (days.isEmpty()) {
            throw new IllegalArgumentException("Incomplete grounded itinerary");
          }

          BigDecimal estimatedTotal =
              parsed.has("estimatedTotalVnd") && parsed.get("estimatedTotalVnd").isNumber()
                  ? BigDecimal.valueOf(parsed.get("estimatedTotalVnd").asLong())
                  : budgetVnd;

          String weatherSummary =
              parsed.has("weatherSummary") && !parsed.get("weatherSummary").asText("").isBlank()
                  ? parsed.get("weatherSummary").asText()
                  : generateSeasonalWeatherInsight(request.destinationProvince(), request.startDate());
          String pacingSummary =
              parsed.has("pacingSummary") && !parsed.get("pacingSummary").asText("").isBlank()
                  ? parsed.get("pacingSummary").asText()
                  : generatePacingInsight(daysCount, request.interests());
          String localAdviceSummary =
              parsed.has("localAdviceSummary") && !parsed.get("localAdviceSummary").asText("").isBlank()
                  ? parsed.get("localAdviceSummary").asText()
                  : generateLocalAdviceInsight(request.destinationProvince(), request.budgetLevel(), request.interests());

          String strategicRationale =
              parsed.has("strategicRationale") && !parsed.get("strategicRationale").asText("").isBlank()
                  ? parsed.get("strategicRationale").asText()
                  : generateStrategicRationale(request.destinationProvince(), daysCount, travelWith, request.interests());

          String companionFitRationale =
              parsed.has("companionFitRationale") && !parsed.get("companionFitRationale").asText("").isBlank()
                  ? parsed.get("companionFitRationale").asText()
                  : generateCompanionFitRationale(members, travelWith, request.interests());

          String budgetOptimizationRationale =
              parsed.has("budgetOptimizationRationale") && !parsed.get("budgetOptimizationRationale").asText("").isBlank()
                  ? parsed.get("budgetOptimizationRationale").asText()
                  : generateBudgetRationale(request.budgetLevel(), budgetVnd, members);

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
                      .toList(),
                  weatherSummary,
                  pacingSummary,
                  localAdviceSummary,
                  strategicRationale,
                  companionFitRationale,
                  budgetOptimizationRationale));
        }
      } catch (Exception ex) {
        log.warn(
            "Quick-plan response rejected: {} ({})",
            ex.getClass().getSimpleName(),
            ex.getMessage());
      }
    }

    return ResponseEntity.ok(
        generateGroundedFallbackResponse(request, daysCount, budgetVnd, publishedDestinations));
  }

  @PostMapping("/quick-plan/modify")
  @Operation(summary = "Trợ lý Chat AI Co-Pilot chỉnh sửa trực tiếp từng hoạt động trong lịch trình")
  public ResponseEntity<AiChatModifyResponse> modifyQuickPlan(
      @Valid @RequestBody AiChatModifyRequest request) {

    String normInstruction = SemanticIntentExtractor.normalizeAscii(request.userInstruction());
    int targetDay = request.targetDayNumber() != null && request.targetDayNumber() > 0
        ? request.targetDayNumber()
        : 1;

    // Nhận diện ngày được nhắc tới trong câu lệnh (ví dụ: "ngày 2", "ngày 3")
    java.util.regex.Matcher dayMatcher = java.util.regex.Pattern.compile("ngay\\s*(\\d+)").matcher(normInstruction);
    if (dayMatcher.find()) {
      try {
        targetDay = Integer.parseInt(dayMatcher.group(1));
      } catch (Exception ignored) {}
    }

    // Nhận diện buổi (TimeSlot) mục tiêu
    String targetSlot = "AFTERNOON";
    if (normInstruction.contains("sang") || normInstruction.contains("morning") || normInstruction.contains("ngu nuong") || normInstruction.contains("day muon")) {
      targetSlot = "MORNING";
    } else if (normInstruction.contains("trua") || normInstruction.contains("an trua") || normInstruction.contains("noon") || normInstruction.contains("lunch")) {
      targetSlot = "NOON";
    } else if (normInstruction.contains("toi") || normInstruction.contains("dem") || normInstruction.contains("an toi") || normInstruction.contains("evening")) {
      targetSlot = "EVENING";
    } else if (normInstruction.contains("chieu") || normInstruction.contains("afternoon")) {
      targetSlot = "AFTERNOON";
    }

    // Trường hợp 1: Yêu cầu lùi giờ khởi hành / ngủ nướng buổi sáng
    if (normInstruction.contains("ngu nuong") || normInstruction.contains("day muon") || normInstruction.contains("lui gio") || normInstruction.contains("khoi hanh muon")) {
      return ResponseEntity.ok(new AiChatModifyResponse(
          String.format("Đã điều chỉnh lịch trình buổi sáng Ngày %d lùi xuống khung giờ 09:30–11:15 để cả đoàn thoải mái ngủ nướng và ăn sáng thong thả!", targetDay),
          "ADJUST_TIME",
          targetDay,
          "MORNING",
          null,
          "09:30–11:15"
      ));
    }

    // Trường hợp 2: Tìm địa điểm thay thế phù hợp nhất từ kho dữ liệu PUBLISHED
    BigDecimal budgetVnd = calculateBudgetVnd(request.budgetLevel(), 3);
    List<DestinationSummary> candidates = destinationQueryService.searchPublished(
        null, request.destinationProvince(), null, budgetVnd, 40);

    java.util.Set<UUID> usedSet = new java.util.HashSet<>(
        request.currentDestinationIds() != null ? request.currentDestinationIds() : List.of());

    boolean wantFood = "NOON".equals(targetSlot)
        || normInstruction.contains("an ")
        || normInstruction.contains("quan")
        || normInstruction.contains("nha hang")
        || normInstruction.contains("chay")
        || normInstruction.contains("hai san")
        || normInstruction.contains("dac san")
        || normInstruction.contains("bun")
        || normInstruction.contains("com");

    boolean wantRelaxedOrElderly = normInstruction.contains("nhe nhang")
        || normInstruction.contains("nguoi lon tuoi")
        || normInstruction.contains("nguoi gia")
        || normInstruction.contains("ong ba")
        || normInstruction.contains("met")
        || normInstruction.contains("khong leo")
        || normInstruction.contains("cafe")
        || normInstruction.contains("ca phe")
        || normInstruction.contains("nghi ngoi");

    boolean wantBeachOrNature = normInstruction.contains("bien")
        || normInstruction.contains("dao mat")
        || normInstruction.contains("ngam canh")
        || normInstruction.contains("song");

    DestinationSummary bestMatch = null;
    double bestScore = -9999.0;

    for (DestinationSummary cand : candidates) {
      double score = usedSet.contains(cand.id()) ? -500.0 : 100.0;
      String candNorm = SemanticIntentExtractor.normalizeAscii(
          (cand.name() != null ? cand.name() : "") + " " + (cand.categoryName() != null ? cand.categoryName() : ""));

      if (wantFood) {
        if (isCulinaryDestination(cand)) score += 300.0;
        else score -= 200.0;
        if (normInstruction.contains("chay") && candNorm.contains("chay")) score += 250.0;
        if (normInstruction.contains("hai san") && (candNorm.contains("hai san") || candNorm.contains("bien"))) score += 200.0;
      }

      if (wantRelaxedOrElderly) {
        SemanticIntentExtractor.PhysicalIntensity intensity = SemanticIntentExtractor.evaluatePhysicalIntensity(cand);
        if (intensity == SemanticIntentExtractor.PhysicalIntensity.LOW) score += 250.0;
        else if (intensity == SemanticIntentExtractor.PhysicalIntensity.HIGH) score -= 600.0;
        if (candNorm.contains("cafe") || candNorm.contains("ca phe") || candNorm.contains("bao tang") || candNorm.contains("song") || candNorm.contains("bien")) {
          score += 120.0;
        }
      }

      if (wantBeachOrNature && (candNorm.contains("bien") || candNorm.contains("song") || candNorm.contains("ho") || candNorm.contains("cau"))) {
        score += 180.0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = cand;
      }
    }

    if (bestMatch == null && !candidates.isEmpty()) {
      bestMatch = candidates.get(0);
    }

    if (bestMatch != null) {
      int people = request.peopleCount() != null && request.peopleCount() > 0 ? request.peopleCount() : 2;
      BigDecimal unitCost = bestMatch.priceMin() != null ? bestMatch.priceMin() : BigDecimal.ZERO;
      BigDecimal totalCost = unitCost.multiply(BigDecimal.valueOf(people));

      String timeRange = switch (targetSlot) {
        case "MORNING" -> "08:30–10:30";
        case "NOON" -> "11:45–13:15";
        case "EVENING" -> "18:30–21:00";
        default -> "14:30–17:00";
      };

      String customReason = wantRelaxedOrElderly
          ? "Địa điểm bằng phẳng, thoáng mát, rất nhẹ nhàng và có nhiều không gian nghỉ chân phù hợp cho người lớn tuổi."
          : wantFood
              ? "Điểm ẩm thực uy tín, hương vị đặc trưng bản địa và không gian ngồi thoải mái."
              : generateWhyVisitReason(bestMatch, List.of("Khám phá", "Thư giãn"));

      SuggestedActivityResponse replacement = new SuggestedActivityResponse(
          bestMatch.id(),
          targetSlot,
          bestMatch.name(),
          totalCost,
          bestMatch.categoryName(),
          bestMatch.name() + " — Đã cập nhật theo yêu cầu trực tiếp từ Trợ lý AI Co-Pilot.",
          customReason,
          generateTimeSlotReason(bestMatch, targetSlot),
          customReason,
          timeRange.split("–")[0],
          timeRange.split("–")[1],
          90,
          15,
          20,
          unitCost.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : "PAID",
          null
      );

      String slotLabel = switch (targetSlot) {
        case "MORNING" -> "buổi sáng";
        case "NOON" -> "bữa trưa";
        case "EVENING" -> "buổi tối";
        default -> "buổi chiều";
      };

      String reply = String.format(
          "Đã cập nhật %s Ngày %d sang **%s** (%s) — %s",
          slotLabel, targetDay, bestMatch.name(), bestMatch.categoryName(), customReason);

      return ResponseEntity.ok(new AiChatModifyResponse(
          reply,
          "REPLACE_ACTIVITY",
          targetDay,
          targetSlot,
          replacement,
          timeRange
      ));
    }

    return ResponseEntity.ok(new AiChatModifyResponse(
        "Trợ lý AI đã ghi nhận yêu cầu và tối ưu hóa nhịp độ nghỉ ngơi thư thả hơn cho đoàn!",
        "RELAX_DAY",
        targetDay,
        targetSlot,
        null,
        null
    ));
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

  static List<SuggestedDayResponse> parseSuggestedDays(
      JsonNode root,
      Map<UUID, DestinationSummary> allowedDestinations,
      int daysCount,
      List<DestinationSummary> publishedDestinations,
      List<String> userInterests,
      LocalTime arrivalTime,
      LocalTime departureTime) {
    List<SuggestedDayResponse> days = new ArrayList<>();
    java.util.Set<UUID> usedIds = new java.util.HashSet<>();
    JsonNode daysNode = root.get("days");
    if (daysNode != null && daysNode.isArray()) {
      for (JsonNode dayNode : daysNode) {
        if (days.size() >= daysCount) break;
        int dayNum = days.size() + 1;
        String title = dayNode.has("title") ? dayNode.get("title").asText() : ("Ngày " + dayNum);
        List<SuggestedActivityResponse> activities = new ArrayList<>();

        JsonNode activitiesNode = dayNode.get("activities");
        if (activitiesNode != null && activitiesNode.isArray()) {
          for (JsonNode actNode : activitiesNode) {
            String timeSlot =
                actNode.has("timeSlot") ? actNode.get("timeSlot").asText() : "MORNING";
            DestinationSummary destination = resolveDestination(actNode, allowedDestinations);
            if (destination == null) continue;
            usedIds.add(destination.id());
            String note =
                actNode.has("activityDescription")
                    ? actNode.get("activityDescription").asText()
                    : "";
            BigDecimal cost =
                destination.priceMin() != null ? destination.priceMin() : BigDecimal.ZERO;

            String rationale =
                actNode.has("rationale") && !actNode.get("rationale").asText("").isBlank()
                    ? actNode.get("rationale").asText()
                    : generateActivityRationale(destination, timeSlot, userInterests);

            String timeSlotReason =
                actNode.has("timeSlotReason") && !actNode.get("timeSlotReason").asText("").isBlank()
                    ? actNode.get("timeSlotReason").asText()
                    : generateTimeSlotReason(destination, timeSlot);

            String whyVisitReason =
                actNode.has("whyVisitReason") && !actNode.get("whyVisitReason").asText("").isBlank()
                    ? actNode.get("whyVisitReason").asText()
                    : generateWhyVisitReason(destination, userInterests);

            activities.add(
                new SuggestedActivityResponse(
                    destination.id(),
                    timeSlot,
                    destination.name(),
                    cost,
                    destination.categoryName(),
                    note,
                    rationale,
                    timeSlotReason,
                    whyVisitReason));
          }
        }
        if (!activities.isEmpty()) {
          // Kiểm tra và khắc phục trùng lặp tiểu loại trong ngày (ví dụ: cấm 2 lăng hoặc 2 chùa trong 1 ngày)
          List<DestinationSummary> dayDests = new ArrayList<>();
          for (int i = 0; i < activities.size(); i++) {
            SuggestedActivityResponse act = activities.get(i);
            DestinationSummary dest = allowedDestinations.get(act.destinationId());
            if (dest == null) continue;
            if (hasSubcategoryConflict(dayDests, dest) && publishedDestinations != null) {
              for (DestinationSummary cand : publishedDestinations) {
                if (!hasSubcategoryConflict(dayDests, cand) && !usedIds.contains(cand.id())) {
                  usedIds.add(cand.id());
                  dest = cand;
                  activities.set(
                      i,
                      new SuggestedActivityResponse(
                          cand.id(),
                          act.timeSlot(),
                          cand.name(),
                          cand.priceMin() != null ? cand.priceMin() : BigDecimal.ZERO,
                          cand.categoryName(),
                          "Đổi sang điểm trải nghiệm đa dạng, tránh lặp lại cùng loại di tích.",
                          generateActivityRationale(cand, act.timeSlot(), userInterests),
                          generateTimeSlotReason(cand, act.timeSlot()),
                          generateWhyVisitReason(cand, userInterests)));
                  break;
                }
              }
            }
            dayDests.add(dest);
          }

          // Đảm bảo mỗi ngày có bữa trưa ẩm thực nạp năng lượng (slot NOON)
          boolean hasNoon = activities.stream().anyMatch(a -> "NOON".equalsIgnoreCase(a.timeSlot()));
          if (!hasNoon && activities.size() >= 2 && publishedDestinations != null) {
            DestinationSummary foodDest = null;
            for (DestinationSummary d : publishedDestinations) {
              if (isCulinaryDestination(d) && !usedIds.contains(d.id())) {
                foodDest = d;
                break;
              }
            }
            if (foodDest == null) {
              for (DestinationSummary d : publishedDestinations) {
                if (isCulinaryDestination(d)) {
                  foodDest = d;
                  break;
                }
              }
            }
            if (foodDest != null) {
              usedIds.add(foodDest.id());
              SuggestedActivityResponse noonAct =
                  new SuggestedActivityResponse(
                      foodDest.id(),
                      "NOON",
                      foodDest.name(),
                      foodDest.priceMin() != null ? foodDest.priceMin() : BigDecimal.valueOf(60000),
                      foodDest.categoryName(),
                      "Dừng chân ăn trưa nạp lại năng lượng và thưởng thức ẩm thực bản địa.",
                      generateActivityRationale(foodDest, "NOON", userInterests),
                      generateTimeSlotReason(foodDest, "NOON"),
                      generateWhyVisitReason(foodDest, userInterests));
              activities.add(1, noonAct);
            }
          }

          List<SuggestedActivityResponse> optimized =
              optimizeDayActivitiesByGeography(activities, allowedDestinations);

          // Áp dụng ràng buộc giờ đến ngày đầu SAU khi đã phân bổ khung giờ (bỏ buổi sáng/trưa nếu đến muộn)
          if (dayNum == 1 && arrivalTime != null) {
            optimized.removeIf(act -> {
              if ("MORNING".equalsIgnoreCase(act.timeSlot())) return true;
              if ("NOON".equalsIgnoreCase(act.timeSlot()) && arrivalTime.isAfter(LocalTime.of(12, 30))) return true;
              return false;
            });
          }

          // Áp dụng ràng buộc giờ rời đi ngày cuối SAU khi đã phân bổ khung giờ (bỏ buổi tối/chiều nếu về sớm)
          if (dayNum == daysCount && departureTime != null) {
            optimized.removeIf(act -> {
              if ("EVENING".equalsIgnoreCase(act.timeSlot()) && departureTime.isBefore(LocalTime.of(19, 0))) return true;
              if ("AFTERNOON".equalsIgnoreCase(act.timeSlot()) && departureTime.isBefore(LocalTime.of(14, 0))) return true;
              if ("NOON".equalsIgnoreCase(act.timeSlot()) && departureTime.isBefore(LocalTime.of(12, 0))) return true;
              return false;
            });
          }

          if (!optimized.isEmpty()) {
            days.add(new SuggestedDayResponse(dayNum, title, optimized));
          }
        }
      }
    }

    if (!days.isEmpty() && days.size() < daysCount && publishedDestinations != null) {
      List<DestinationSummary> pool = new ArrayList<>(diversifyByCategory(publishedDestinations));
      double[] center = computeCentroid(pool);
      String[] slots = STANDARD_SLOTS;
      while (days.size() < daysCount) {
        int dayNum = days.size() + 1;
        List<SuggestedActivityResponse> activities = new ArrayList<>();
        List<DestinationSummary> dayChosenDestinations = new ArrayList<>();
        DestinationSummary prev = null;
        DestinationSummary morningOutskirt = null;
        BigDecimal dayAccumulatedTicketCost = BigDecimal.ZERO;
        for (int slotIdx = 0; slotIdx < slots.length; slotIdx++) {
          String slot = slots[slotIdx];
          DestinationSummary chosen =
              selectBestGeoAndTimeCandidate(
                  pool, usedIds, prev, slot, center, morningOutskirt, dayAccumulatedTicketCost, dayChosenDestinations);
          if (chosen == null) {
            for (DestinationSummary cand : pool) {
              if (!hasSubcategoryConflict(dayChosenDestinations, cand)) {
                chosen = cand;
                break;
              }
            }
            if (chosen == null) {
              chosen = pool.get(((dayNum - 1) * slots.length + slotIdx) % pool.size());
            }
          }
          usedIds.add(chosen.id());
          dayChosenDestinations.add(chosen);
          if ("MORNING".equals(slot) && isOutskirtDestination(chosen, center)) {
            morningOutskirt = chosen;
          }
          if (chosen.priceMin() != null) {
            dayAccumulatedTicketCost = dayAccumulatedTicketCost.add(chosen.priceMin());
          }
          activities.add(
              new SuggestedActivityResponse(
                  chosen.id(),
                  slot,
                  chosen.name(),
                  chosen.priceMin() != null ? chosen.priceMin() : BigDecimal.ZERO,
                  chosen.categoryName(),
                  slot.equals("NOON") ? "Nghỉ trưa, nạp lại năng lượng và thưởng thức ẩm thực đặc sản." : "Gợi ý bổ sung theo cung đường thuận tiện di chuyển.",
                  generateActivityRationale(chosen, slot, userInterests),
                  generateTimeSlotReason(chosen, slot),
                  generateWhyVisitReason(chosen, userInterests)));
          prev = chosen;
        }
        days.add(
            new SuggestedDayResponse(
                dayNum, "Ngày " + dayNum + " — Khám phá mở rộng", activities));
      }
    }
    return days;
  }

  static DestinationSummary resolveDestination(
      JsonNode actNode, Map<UUID, DestinationSummary> allowedDestinations) {
    String rawId = actNode.path("destinationId").asText("").trim();
    if (!rawId.isEmpty()) {
      try {
        DestinationSummary byUuid = allowedDestinations.get(UUID.fromString(rawId));
        if (byUuid != null) return byUuid;
      } catch (IllegalArgumentException ignored) {
      }
    }
    String candidateName =
        actNode.has("placeName")
            ? actNode.get("placeName").asText("")
            : actNode.path("destinationName").asText(rawId);
    if (candidateName != null && !candidateName.isBlank()) {
      String norm = candidateName.trim().toLowerCase();
      for (DestinationSummary d : allowedDestinations.values()) {
        if (d.name() != null
            && (d.name().trim().equalsIgnoreCase(norm)
                || norm.contains(d.name().trim().toLowerCase())
                || d.name().trim().toLowerCase().contains(norm))) {
          return d;
        }
      }
    }
    return null;
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
        generateSeasonalWeatherInsight(request.destinationProvince(), request.startDate()),
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

  static String generateSeasonalWeatherInsight(String province, String startDate) {
    int month = java.time.LocalDate.now().getMonthValue();
    if (startDate != null && !startDate.isBlank()) {
      try {
        month = java.time.LocalDate.parse(startDate.substring(0, 10)).getMonthValue();
      } catch (Exception ignored) {
      }
    }
    String prov = province != null ? province.toLowerCase() : "";
    if (prov.contains("đà nẵng") || prov.contains("hội an") || prov.contains("huế") || prov.contains("hà tĩnh") || prov.contains("quảng")) {
      if (month >= 9 && month <= 12) {
        return "23°C – 28°C · Mùa mưa se lạnh miền Trung, biển có sóng lớn; nên mang ô/áo mưa và ưu tiên các điểm tham quan văn hóa, bảo tàng, ẩm thực trong nhà.";
      } else {
        return "27°C – 34°C · Nắng ráo chan hòa, biển êm sóng lặng; thời tiết lý tưởng để tắm biển, lặn san hô và ngắm hoàng hôn bán đảo.";
      }
    }
    if (prov.contains("hà nội") || prov.contains("ninh bình") || prov.contains("hạ long") || prov.contains("sa pa") || prov.contains("hà giang")) {
      if (month >= 11 || month <= 2) {
        return "14°C – 20°C · Mùa đông se lạnh khô ráo, vùng núi có sương mù bồng bềnh; cần mang áo khoác ấm và khăn quàng khi đi dạo phố/săn mây.";
      } else if (month >= 5 && month <= 8) {
        return "29°C – 36°C · Mùa hè nắng ấm, chiều có thể có mưa rào; thích hợp dạo phố sớm và thưởng thức ẩm thực đêm.";
      } else {
        return "22°C – 28°C · Mùa thu trong lành mát mẻ, trời xanh nắng dịu; thời điểm vàng để check-in và khám phá danh thắng ngoài trời.";
      }
    }
    if (prov.contains("đà lạt")) {
      return "15°C – 24°C · Tiết trời cao nguyên se lạnh quanh năm, sáng sớm nhiều sương mù và nắng nhẹ; mang trang phục ấm và chụp ảnh rất đẹp.";
    }
    if (prov.contains("phú quốc") || prov.contains("hồ chí minh") || prov.contains("vũng tàu") || prov.contains("cần thơ")) {
      if (month >= 11 || month <= 4) {
        return "26°C – 33°C · Mùa khô tuyệt đẹp phương Nam, trời trong vắt, biển ngọc êm ả; hoàn hảo cho các hoạt động cano đảo và tiệc hoàng hôn.";
      } else {
        return "25°C – 31°C · Mùa mưa nhiệt đới với các cơn mưa rào nhanh buổi chiều; buổi sáng trời nắng ráo thuận tiện dạo chơi.";
      }
    }
    return "25°C – 31°C · Tiết trời tương đối thuận lợi, nhiệt độ vừa phải; thích hợp khám phá cảnh quan và giao lưu ẩm thực bản địa.";
  }

  static String generatePacingInsight(int daysCount, List<String> interests) {
    String joined = interests != null ? String.join(" ", interests).toLowerCase() : "";
    if (joined.contains("trekking") || joined.contains("núi") || joined.contains("phượt")) {
      return String.format("Nhịp độ khám phá năng động (%d ngày): Ưu tiên các điểm địa hình buổi sáng sớm, dành buổi chiều thư giãn ẩm thực để bảo toàn thể lực.", daysCount);
    }
    if (joined.contains("nghỉ dưỡng") || joined.contains("biển")) {
      return String.format("Nhịp độ nghỉ dưỡng thảnh thơi (%d ngày): Tối đa 3 hoạt động/ngày, không di chuyển vội vã, ưu tiên ngắm bình minh và thư giãn biển chiều.", daysCount);
    }
    if (joined.contains("ẩm thực")) {
      return String.format("Nhịp độ trải nghiệm văn hóa & vị giác (%d ngày): Chia nhỏ các chặng ăn vặt và ẩm thực đặc sản đan xen giữa các điểm danh thắng nổi tiếng.", daysCount);
    }
    return String.format("Nhịp độ cân bằng tối ưu (%d ngày): Khoảng cách di chuyển giữa các điểm dưới 15km, tránh đi ngược hướng, tối ưu thời gian vui chơi.", daysCount);
  }

  static String generateLocalAdviceInsight(String province, String budgetLevel, List<String> interests) {
    String prov = province != null ? province : "điểm đến";
    String b = budgetLevel != null ? budgetLevel.toUpperCase() : "MEDIUM";
    String focusNote = (interests != null && !interests.isEmpty())
        ? (" (ưu tiên " + String.join(", ", interests) + ")")
        : "";
    if (b.contains("TIET_KIEM") || b.contains("BUDGET") || b.contains("LOW")) {
      return String.format("Mẹo tiết kiệm tại %s%s: Thuê xe máy theo cặp (120k-150k/ngày), thưởng thức ẩm thực chợ truyền thống và tận dụng các điểm đến mở miễn phí vé tham quan.", prov, focusNote);
    }
    if (b.contains("LUXURY") || b.contains("HIGH")) {
      return String.format("Trải nghiệm cao cấp tại %s%s: Nên đặt trước dịch vụ xe riêng đón tận nơi, thưởng thức ẩm thực tại các nhà hàng đạt chuẩn Michelin/view biển và dịch vụ tour trọn gói.", prov, focusNote);
    }
    return String.format("Lời khuyên hữu ích tại %s%s: Đặt trước vé các khu du lịch lớn trực tuyến để không phải xếp hàng chờ, đồng thời thử các món ăn dân dã tại các quán có đông người bản xứ ăn uống.", prov, focusNote);
  }

  static String generateStrategicRationale(String province, int daysCount, String travelWith, List<String> interests) {
    String prov = province != null ? province : "điểm đến";
    String with = travelWith != null ? travelWith : "đoàn";
    String interestLabel = (interests != null && !interests.isEmpty()) ? String.join(", ", interests) : "khám phá & ẩm thực";
    return String.format(
        "Hành trình %d ngày tại %s được sắp xếp liền kề trên cùng một cung đường tiện lợi, giúp bạn di chuyển nhanh chóng, tiết kiệm tiền taxi và không bị mệt hay say xe. Nhịp độ đan xen hài hòa theo sở thích (%s), đem lại trải nghiệm trọn vẹn và thoải mái nhất cho %s.",
        daysCount, prov, interestLabel, with);
  }

  static String generateCompanionFitRationale(Integer peopleCount, String travelWith, List<String> interests) {
    int count = peopleCount != null && peopleCount > 0 ? peopleCount : 2;
    String with = travelWith != null ? travelWith.toLowerCase() : "nhóm bạn";
    String interestTag = (interests != null && !interests.isEmpty()) ? (" kết hợp " + interests.get(0).toLowerCase()) : "";
    if (with.contains("gia đình") || with.contains("family")) {
      return String.format(
          "Thiết kế riêng cho gia đình %d người%s: Lịch trình thong thả, cung đường bằng phẳng có nhiều bóng râm mát mẻ, rất an toàn và thoải mái cho cả người lớn tuổi lẫn các bé nhỏ.",
          count, interestTag);
    }
    if (with.contains("cặp đôi") || with.contains("couple")) {
      return String.format(
          "Dành riêng cho cặp đôi %d người%s: Lịch trình chú trọng không gian lãng mạn, đón hoàng hôn tuyệt đẹp và thưởng thức ẩm thực đặc sản mà không phải vội vã.",
          count, interestTag);
    }
    return String.format(
        "Lịch trình được cân đối vừa sức cho đoàn %d người%s: Buổi sáng dồi dào năng lượng đi ngắm cảnh ngoài trời; buổi chiều tối dành cho ẩm thực và dạo mát thư giãn, đảm bảo mọi người luôn tràn đầy hứng khởi.",
        count, interestTag);
  }

  static String generateBudgetRationale(String budgetLevel, BigDecimal totalBudget, Integer peopleCount) {
    int count = peopleCount != null && peopleCount > 0 ? peopleCount : 2;
    String b = budgetLevel != null ? budgetLevel.toUpperCase() : "STANDARD";
    if (b.contains("TIET_KIEM") || b.contains("BUDGET") || b.contains("LOW")) {
      return String.format(
          "Chi tiêu thông minh & tiết kiệm: Dành phần lớn ngân sách cho các món ăn ngon đặc sản, kết hợp tham quan các danh lam mở miễn phí vé và đi lại hợp lý (ước tính ~%,d VNĐ/người, không lo phát sinh).",
          totalBudget != null ? totalBudget.divide(BigDecimal.valueOf(count), java.math.RoundingMode.HALF_UP).longValue() : 600000L);
    }
    if (b.contains("SANG_TRONG") || b.contains("LUXURY") || b.contains("HIGH")) {
      return String.format(
          "Trải nghiệm cao cấp & trọn gói: Ưu tiên các dịch vụ vé VIP không phải xếp hàng chờ đợi, ăn uống tại các nhà hàng view biển lãng mạn và xe riêng đưa đón tiện nghi (ước tính ~%,d VNĐ/người).",
          totalBudget != null ? totalBudget.divide(BigDecimal.valueOf(count), java.math.RoundingMode.HALF_UP).longValue() : 3000000L);
    }
    return String.format(
        "Chi tiêu cân đối & hợp lý: Kết hợp hài hòa giữa các điểm tham quan có vé danh tiếng và ẩm thực đặc sản bản địa uy tín, đảm bảo trải nghiệm đầy đủ mà không lo phát sinh phụ phí (ước tính ~%,d VNĐ/người).",
        totalBudget != null ? totalBudget.divide(BigDecimal.valueOf(count), java.math.RoundingMode.HALF_UP).longValue() : 1400000L);
  }

  public static final String[] STANDARD_SLOTS = {"MORNING", "NOON", "AFTERNOON", "EVENING"};

  private static final List<String> RESTRICTED_SUBCATEGORIES = List.of(
      "lăng", "chùa", "bãi biển", "biển", "động", "thác", "bảo tàng", "núi", "đèo"
  );

  public static boolean hasSubcategoryConflict(List<DestinationSummary> chosenSoFar, DestinationSummary cand) {
    if (chosenSoFar == null || cand == null || cand.name() == null) return false;
    String candName = cand.name().toLowerCase();
    for (DestinationSummary already : chosenSoFar) {
      if (already == null || already.name() == null) continue;
      String alreadyName = already.name().toLowerCase();
      for (String kw : RESTRICTED_SUBCATEGORIES) {
        if (alreadyName.contains(kw) && candName.contains(kw)) {
          return true;
        }
      }
    }
    return false;
  }

  public static boolean isCulinaryDestination(DestinationSummary d) {
    if (d == null) return false;
    String text =
        ((d.name() != null ? d.name() : "") + " " + (d.categoryName() != null ? d.categoryName() : ""))
            .toLowerCase();
    return text.contains("ẩm thực")
        || text.contains("chợ")
        || text.contains("quán")
        || text.contains("nhà hàng")
        || text.contains("bún")
        || text.contains("cơm")
        || text.contains("bánh")
        || text.contains("chè")
        || text.contains("đặc sản")
        || text.contains("ăn uống")
        || text.contains("cà phê")
        || text.contains("cafe");
  }

  static String generateTimeSlotReason(DestinationSummary dest, String timeSlot) {
    String slot = timeSlot != null ? timeSlot.toUpperCase() : "MORNING";
    String cat = dest.categoryName() != null ? dest.categoryName().toLowerCase() : "";
    if ("MORNING".equals(slot)) {
      if (cat.contains("biển") || cat.contains("đảo")) {
        return "Sáng sớm (08:00 – 10:30) nắng dịu nhẹ, sóng êm và biển xanh trong nhất, chụp ảnh không bị chói mắt và không khí mát rượi.";
      }
      if (cat.contains("núi") || cat.contains("thiên nhiên") || cat.contains("sinh thái")) {
        return "Nên đi vào buổi sáng lúc thể lực dồi dào nhất, không khí vùng cao trong lành và tránh được cái nắng gắt buổi trưa.";
      }
      return "Khung giờ vàng đầu ngày, thời tiết mát mẻ và ít đông đúc, khởi đầu ngày mới tràn đầy năng lượng.";
    } else if ("NOON".equals(slot)) {
      return "Khung giờ trưa (11:30 – 13:00) tiết trời nắng gắt nhất, hoàn hảo để dừng chân nghỉ ngơi trong không gian mát mẻ, nạp năng lượng và thưởng thức trọn vẹn tinh hoa ẩm thực bản địa.";
    } else if ("AFTERNOON".equals(slot)) {
      if (cat.contains("văn hóa") || cat.contains("bảo tàng") || cat.contains("chùa") || cat.contains("di tích")) {
        return "Đầu giờ chiều nắng ráo, không gian râm mát thích hợp để tìm hiểu lịch sử, ngắm nhìn kiến trúc và thong dong dạo bước.";
      }
      return "Thời điểm chiều tà đón gió mát lành, ánh hoàng hôn buông xuống chụp ảnh check-in có màu sắc ấm áp tuyệt đẹp.";
    } else {
      if (cat.contains("ẩm thực") || cat.contains("chợ")) {
        return "Buổi tối là thời điểm các quầy ẩm thực lên bếp thơm nức, phố xá tấp nập người bản xứ và khách du lịch giao lưu sôi nổi.";
      }
      return "Buổi tối phố xá lên đèn lung linh huyền ảo, tiết trời dịu mát rất thích hợp để dạo bộ hóng gió và tận hưởng nhịp sống về đêm.";
    }
  }

  static String generateWhyVisitReason(DestinationSummary dest, List<String> interests) {
    String cat = dest.categoryName() != null ? dest.categoryName().toLowerCase() : "";
    String interestSuffix = (interests != null && !interests.isEmpty()) ? (" Rất phù hợp với gu " + interests.get(0).toLowerCase() + " của đoàn.") : "";
    if (isCulinaryDestination(dest) || cat.contains("ẩm thực") || cat.contains("chợ")) {
      return "Thiên đường ăn uống với vô vàn món đặc sản nóng hổi chuẩn vị địa phương, giá cả bình dân và không khí vô cùng ấm cúng." + interestSuffix;
    }
    if (cat.contains("biển") || cat.contains("đảo")) {
      return "Bãi biển tuyệt đẹp với bờ cát mịn và làn nước trong xanh, là điểm đến biểu tượng nhất định phải check-in khi đến đây." + interestSuffix;
    }
    if (cat.contains("văn hóa") || cat.contains("chùa") || cat.contains("di tích") || cat.contains("bảo tàng")) {
      return "Lưu giữ chiều sâu văn hóa và kiến trúc độc đáo, mang lại cảm giác an yên và những góc hình kỷ niệm rất có chiều sâu." + interestSuffix;
    }
    if (cat.contains("núi") || cat.contains("sinh thái") || cat.contains("rừng")) {
      return "Cảnh sắc thiên nhiên khoáng đạt giúp bạn hít thở không khí trong lành, xua tan mệt mỏi và chiêm ngưỡng toàn cảnh danh thắng." + interestSuffix;
    }
    return "Một trong những điểm dừng chân được yêu thích nhất trong vùng, thuận tiện trên cung đường và mang đến nhiều trải nghiệm thú vị." + interestSuffix;
  }

  static String generateActivityRationale(DestinationSummary dest, String timeSlot, List<String> interests) {
    String slot = timeSlot != null ? timeSlot.toUpperCase() : "MORNING";
    String cat = dest.categoryName() != null ? dest.categoryName().toLowerCase() : "";
    String focus = (interests != null && !interests.isEmpty()) ? (" (" + interests.get(0) + ")") : "";
    if ("MORNING".equals(slot)) {
      if (cat.contains("biển") || cat.contains("đảo")) {
        return "Buổi sáng thời tiết êm dịu, không khí trong lành và nắng chưa gắt, hoàn hảo để ngắm biển và check-in" + focus + ".";
      }
      if (cat.contains("núi") || cat.contains("thiên nhiên") || cat.contains("sinh thái")) {
        return "Ưu tiên điểm vận động tự nhiên vào sáng sớm khi thể lực đoàn dồi dào nhất và tránh nắng gắt buổi trưa" + focus + ".";
      }
      return "Khởi đầu ngày mới với điểm tham quan biểu tượng, thuận tiện mở đầu cung đường" + focus + ".";
    } else if ("NOON".equals(slot)) {
      return "Nghỉ ngơi ăn trưa nạp lại năng lượng sau chặng tham quan sáng, thưởng thức tinh hoa ẩm thực bản địa trước khi tiếp tục hành trình chiều.";
    } else if ("AFTERNOON".equals(slot)) {
      if (cat.contains("văn hóa") || cat.contains("bảo tàng") || cat.contains("chùa") || cat.contains("di tích")) {
        return "Khám phá chiều sâu văn hóa và kiến trúc, có nhiều bóng râm hoặc không gian mát mẻ cho buổi đầu giờ chiều" + focus + ".";
      }
      return "Tận hưởng không gian cảnh quan chiều tà, vừa vặn trên trục đường di chuyển trở về trung tâm" + focus + ".";
    } else {
      if (cat.contains("ẩm thực") || cat.contains("chợ")) {
        return "Thời điểm chợ đêm và phố ẩm thực nhộn nhịp nhất, tha hồ thưởng thức đặc sản và hòa vào nhịp sống bản địa.";
      }
      return "Chiêm ngưỡng cảnh đêm lung linh và thư giãn thảnh thơi sau một ngày khám phá trọn vẹn" + focus + ".";
    }
  }

  static DestinationSummary selectBestGeoAndTimeCandidate(
      List<DestinationSummary> pool,
      java.util.Set<UUID> usedIds,
      DestinationSummary prev,
      String slot,
      double[] center,
      DestinationSummary morningOutskirt,
      BigDecimal dayAccumulatedTicketCost,
      List<DestinationSummary> dayChosenDestinations) {
    DestinationSummary best = null;
    double bestCost = Double.MAX_VALUE;

    for (DestinationSummary cand : pool) {
      boolean alreadyUsed = usedIds.contains(cand.id());
      double score = alreadyUsed ? 250.0 : 0.0;
      boolean candIsOutskirt = isOutskirtDestination(cand, center);

      // Quy tắc nghiêm ngặt: Tuyệt đối không trùng tiểu loại trong 1 ngày (cấm 2 lăng, 2 chùa, 2 biển)
      if (hasSubcategoryConflict(dayChosenDestinations, cand)) {
        score += 2500.0;
      }

      // Quy tắc bữa trưa & khung giờ ẩm thực:
      if ("NOON".equals(slot)) {
        if (isCulinaryDestination(cand)) {
          score -= 140.0; // Ưu tiên cao nhất điểm ẩm thực/chợ/quán ăn buổi trưa
        } else {
          score += 600.0; // Phạt cực nặng điểm di tích/leo trèo giữa trưa nắng
        }
      } else if ("MORNING".equals(slot)) {
        if (isCulinaryDestination(cand)) {
          score += 60.0; // Sáng sớm ưu tiên ngắm cảnh/di tích
        }
      } else if ("AFTERNOON".equals(slot)) {
        if (isCulinaryDestination(cand)) {
          score += 30.0; // Chiều ưu tiên làng nghề/văn hóa/biển mát
        }
      } else if ("EVENING".equals(slot)) {
        if (isCulinaryDestination(cand)) {
          score -= 30.0; // Buổi tối dạo chợ ẩm thực/ăn tối
        }
      }

      // Quy tắc 1: Phân bổ Ngoại ô & Trục hướng địa lý (Azimuth Cluster Alignment)
      if ("MORNING".equals(slot)) {
        if (candIsOutskirt) {
          score -= 16.0; // Buổi sáng ưu tiên giải quyết điểm ngoại ô/núi/đèo lúc trời mát
        }
      } else {
        if (morningOutskirt != null && candIsOutskirt) {
          double kmFromPrev = prev != null ? haversineKm(prev, cand) : 999.0;
          double angleDiff = Math.abs(computeAngleDifference(
              computeAzimuthDegrees(center, morningOutskirt),
              computeAzimuthDegrees(center, cand)));

          // Nếu điểm ngoại ô mới nằm lệch góc > 45 độ hoặc cách > 7.5km => Phạt cực nặng
          if (angleDiff > 45.0 || kmFromPrev > 7.5) {
            score += 130.0; // Triệt tiêu hiện tượng đi Ngũ Hành Sơn xong lại chạy vòng sang Đèo Hải Vân/Bà Nà
          }
        }
        if (!candIsOutskirt) {
          score -= 10.0; // Buổi chiều & tối kéo lịch trình về cụm trung tâm / biển gần nhau
        }
      }

      // Quy tắc 2: Tối ưu Khoảng cách Di chuyển
      if (prev != null) {
        double km = haversineKm(prev, cand);
        if (km < 900) {
          score += km * 2.2;
          if (km > 15.0) {
            score += 45.0;
          }
        }
        if (sameCategory(prev.categoryName(), cand.categoryName())) {
          score += 70.0; // Cấm lặp lại 2 bãi biển hoặc 2 bảo tàng liên tiếp
        }
      }

      // Quy tắc 3: Khung giờ sinh học & Thời tiết
      score += timeSlotPenalty(cand, slot);

      // Quy tắc 4: Cân bằng Thể lực & Nhịp độ (Fatigue & Pacing Index)
      int candFatigue = calculateFatigueLevel(cand);
      if ("AFTERNOON".equals(slot) || "EVENING".equals(slot)) {
        if (morningOutskirt != null && calculateFatigueLevel(morningOutskirt) >= 2) {
          if (candFatigue == 0) {
            score -= 18.0; // Sau buổi sáng tốn sức (leo núi/đèo), chiều tối ưu tiên ẩm thực/cafe nghỉ ngơi
          } else if (candFatigue >= 2) {
            score += 40.0; // Tránh dồn 2 hoạt động nặng trong cùng 1 ngày
          }
        }
      }

      // Quy tắc 5: Cân đối Ngân sách Vé Ngày (Smart Budget Pacing)
      if (dayAccumulatedTicketCost != null && dayAccumulatedTicketCost.compareTo(BigDecimal.valueOf(200000)) >= 0) {
        BigDecimal candPrice = cand.priceMin() != null ? cand.priceMin() : BigDecimal.ZERO;
        if (candPrice.compareTo(BigDecimal.ZERO) == 0) {
          score -= 14.0; // Ưu tiên điểm miễn phí (Cầu Rồng, Biển, Chợ đêm) để cân bằng ví tiền
        } else if (candPrice.compareTo(BigDecimal.valueOf(250000)) >= 0) {
          score += 35.0; // Tránh gom 2 điểm vé đắt vào cùng 1 ngày
        }
      }

      if (score < bestCost) {
        bestCost = score;
        best = cand;
      }
    }
    return best;
  }

  static double computeAzimuthDegrees(double[] center, DestinationSummary d) {
    if (d == null || d.latitude() == null || d.longitude() == null || center == null) return 0.0;
    double dLat = d.latitude() - center[0];
    double dLon = d.longitude() - center[1];
    return Math.toDegrees(Math.atan2(dLat, dLon));
  }

  static double computeAngleDifference(double a1, double a2) {
    double diff = (a1 - a2 + 180.0) % 360.0 - 180.0;
    return Math.abs(diff < -180.0 ? diff + 360.0 : diff);
  }

  static int calculateFatigueLevel(DestinationSummary d) {
    if (d == null) return 1;
    String text =
        ((d.name() != null ? d.name() : "") + " " + (d.categoryName() != null ? d.categoryName() : ""))
            .toLowerCase();
    if (text.contains("núi")
        || text.contains("đèo")
        || text.contains("phượt")
        || text.contains("bà nà")
        || text.contains("trekking")
        || text.contains("công viên nước")) {
      return 2;
    }
    if (text.contains("ẩm thực")
        || text.contains("chợ")
        || text.contains("quán")
        || text.contains("cà phê")
        || text.contains("ngắm")
        || text.contains("cầu rồng")) {
      return 0;
    }
    return 1;
  }

  static double[] computeCentroid(List<DestinationSummary> destinations) {
    List<Double> lats = new ArrayList<>();
    List<Double> lngs = new ArrayList<>();
    for (DestinationSummary d : destinations) {
      if (d.latitude() != null && d.longitude() != null) {
        lats.add(d.latitude());
        lngs.add(d.longitude());
      }
    }
    if (lats.isEmpty()) return new double[] {0.0, 0.0};
    lats.sort(Double::compareTo);
    lngs.sort(Double::compareTo);
    // Dùng Median (trung vị) để tâm luôn rơi đúng vào Trung tâm thành phố, không bị kéo lệch bởi điểm xa
    int mid = lats.size() / 2;
    return new double[] {lats.get(mid), lngs.get(mid)};
  }

  static boolean isOutskirtDestination(DestinationSummary d, double[] center) {
    if (d == null || d.latitude() == null || d.longitude() == null || center == null) {
      return false;
    }
    double distToCenter = haversineCoords(d.latitude(), d.longitude(), center[0], center[1]);
    return distToCenter > 6.5;
  }

  static List<SuggestedActivityResponse> optimizeDayActivitiesByGeography(
      List<SuggestedActivityResponse> rawActivities,
      Map<UUID, DestinationSummary> allowedDestinations) {
    if (rawActivities == null || rawActivities.size() <= 1) {
      return rawActivities;
    }
    List<SuggestedActivityResponse> remaining = new ArrayList<>(rawActivities);

    // Tìm hoạt động ẩm thực dành cho bữa trưa (slot NOON)
    SuggestedActivityResponse lunchAct = null;
    for (int i = 0; i < remaining.size(); i++) {
      SuggestedActivityResponse act = remaining.get(i);
      DestinationSummary d = allowedDestinations.get(act.destinationId());
      if ("NOON".equalsIgnoreCase(act.timeSlot()) || isCulinaryDestination(d)) {
        lunchAct = remaining.remove(i);
        break;
      }
    }

    // Chọn điểm đầu ngày hợp buổi sáng nhất (ưu tiên núi/đèo/di tích ngoài trời)
    remaining.sort(
        (a, b) -> {
          DestinationSummary da = allowedDestinations.get(a.destinationId());
          DestinationSummary db = allowedDestinations.get(b.destinationId());
          return Double.compare(
              timeSlotPenalty(da, "MORNING"), timeSlotPenalty(db, "MORNING"));
        });

    List<SuggestedActivityResponse> ordered = new ArrayList<>();
    if (!remaining.isEmpty()) {
      ordered.add(withSlot(remaining.remove(0), "MORNING"));
    }
    if (lunchAct != null) {
      ordered.add(withSlot(lunchAct, "NOON"));
    }
    if (!remaining.isEmpty()) {
      ordered.add(withSlot(remaining.remove(0), "AFTERNOON"));
    }
    if (!remaining.isEmpty()) {
      ordered.add(withSlot(remaining.remove(0), "EVENING"));
    }
    while (!remaining.isEmpty()) {
      ordered.add(remaining.remove(0));
    }
    return ordered;
  }

  static SuggestedActivityResponse withSlot(SuggestedActivityResponse act, String slot) {
    return new SuggestedActivityResponse(
        act.destinationId(),
        slot,
        act.destinationName(),
        act.estimatedCost(),
        act.category(),
        act.note(),
        act.rationale(),
        act.timeSlotReason(),
        act.whyVisitReason());
  }

  static double timeSlotPenalty(DestinationSummary d, String slot) {
    if (d == null) return 0.0;
    String text =
        ((d.name() != null ? d.name() : "") + " " + (d.categoryName() != null ? d.categoryName() : ""))
            .toLowerCase();
    boolean isMountainOrPass =
        text.contains("đèo") || text.contains("núi") || text.contains("phượt") || text.contains("bà nà");
    boolean isBeach = text.contains("biển") || text.contains("đảo") || text.contains("bãi");
    boolean isIndoorOrCulture =
        text.contains("bảo tàng")
            || text.contains("văn hóa")
            || text.contains("di tích")
            || text.contains("chùa")
            || text.contains("suối khoáng");
    boolean isNightOrCity =
        text.contains("cầu") || text.contains("phố") || text.contains("đêm") || text.contains("giải trí");

    return switch (slot) {
      case "MORNING" -> {
        if (isMountainOrPass) yield -14.0; // Sáng mát cực hợp đi đèo, núi, thắng cảnh xa
        if (isIndoorOrCulture) yield -8.0; // Sáng sớm di tích thoáng mát, vắng khách
        if (isNightOrCity) yield 20.0; // Phố đêm / Cầu Rồng không đi buổi sáng sớm
        yield 0.0;
      }
      case "NOON" -> {
        if (isCulinaryDestination(d)) yield -35.0; // Buổi trưa bắt buộc ưu tiên ăn uống đặc sản, chợ
        if (isMountainOrPass) yield 80.0; // Tuyệt đối không leo núi / đèo giữa trưa nắng gắt
        if (isBeach) yield 60.0; // Không phơi nắng biển giữa trưa
        yield 25.0;
      }
      case "AFTERNOON" -> {
        if (isMountainOrPass) yield 35.0; // Hạn chế đi đèo / leo núi giữa trưa nắng gắt
        if (isBeach) yield -10.0; // Tắm biển chiều sau 15h30 cực đẹp
        if (isIndoorOrCulture) yield -12.0; // Ưu tiên văn hóa, bảo tàng, làng nghề râm mát
        yield 0.0;
      }
      case "EVENING" -> {
        if (isMountainOrPass) yield 50.0; // Chiều tối không đi đèo/núi nguy hiểm
        if (isNightOrCity || isBeach || isCulinaryDestination(d)) yield -15.0; // Chiều mát / tối hợp dạo biển, cầu Rồng, phố đêm
        yield 0.0;
      }
      default -> 0.0;
    };
  }

  static boolean sameCategory(String c1, String c2) {
    if (c1 == null || c2 == null) return false;
    return c1.trim().equalsIgnoreCase(c2.trim());
  }

  static double haversineKm(DestinationSummary a, DestinationSummary b) {
    if (a == null
        || b == null
        || a.latitude() == null
        || a.longitude() == null
        || b.latitude() == null
        || b.longitude() == null) {
      return 999.0;
    }
    return haversineCoords(a.latitude(), a.longitude(), b.latitude(), b.longitude());
  }

  static double haversineCoords(double latA, double lonA, double latB, double lonB) {
    double R = 6371.0;
    double dLat = Math.toRadians(latB - latA);
    double dLon = Math.toRadians(lonB - lonA);
    double lat1 = Math.toRadians(latA);
    double lat2 = Math.toRadians(latB);
    double h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * Sắp xếp xen kẽ theo thể loại (Round-Robin Category Interleaving) để không bao giờ xếp 2 bãi
   * biển hoặc 2 địa điểm cùng loại sát giờ nhau trong cùng 1 ngày.
   */
  static List<DestinationSummary> diversifyByCategory(List<DestinationSummary> input) {
    if (input == null || input.size() <= 1) {
      return input;
    }
    Map<String, List<DestinationSummary>> buckets = new LinkedHashMap<>();
    for (DestinationSummary d : input) {
      String cat = d.categoryName() != null ? d.categoryName().trim().toLowerCase() : "other";
      buckets.computeIfAbsent(cat, k -> new ArrayList<>()).add(d);
    }
    List<DestinationSummary> result = new ArrayList<>(input.size());
    boolean added;
    do {
      added = false;
      for (List<DestinationSummary> group : buckets.values()) {
        if (!group.isEmpty()) {
          result.add(group.remove(0));
          added = true;
        }
      }
    } while (added);
    return result;
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
