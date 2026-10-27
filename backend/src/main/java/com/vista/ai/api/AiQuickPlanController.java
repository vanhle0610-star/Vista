package com.vista.ai.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedActivityResponse;
import com.vista.ai.api.dto.AiItinerarySuggestionResponse.SuggestedDayResponse;
import com.vista.ai.client.AiClientWrapper;
import com.vista.ai.config.AiRateLimiter;
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
@Tag(
    name = "AI Quick Plan",
    description = "Trợ lý AI tạo lịch trình nhanh cho khách vãng lai và người dùng (TV4)")
public class AiQuickPlanController {

  private static final Logger log = LoggerFactory.getLogger(AiQuickPlanController.class);

  private final AiClientWrapper aiClientWrapper;
  private final AiRateLimiter aiRateLimiter;

  @Autowired
  public AiQuickPlanController(
      AiClientWrapper aiClientWrapper, @Autowired(required = false) AiRateLimiter aiRateLimiter) {
    this.aiClientWrapper = aiClientWrapper;
    this.aiRateLimiter = aiRateLimiter;
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
    if (request.destinationProvince() != null && request.destinationProvince().trim().length() > 100) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Tên điểm đến không được vượt quá 100 ký tự");
    }
    if (request.interests() != null) {
      if (request.interests().size() > 10) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "Số lượng sở thích tối đa là 10");
      }
      for (String interest : request.interests()) {
        if (interest != null && interest.length() > 50) {
          throw new org.springframework.web.server.ResponseStatusException(
              org.springframework.http.HttpStatus.BAD_REQUEST, "Độ dài mỗi sở thích tối đa là 50 ký tự");
        }
      }
    }

    int daysCount = request.totalDays() != null ? request.totalDays() : 3;
    if (daysCount <= 0 || daysCount > 14) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Số ngày lịch trình phải từ 1 đến 14 ngày");
    }
    BigDecimal budgetVnd = calculateBudgetVnd(request.budgetLevel(), daysCount);

    if (aiClientWrapper != null && aiClientWrapper.isAvailable()) {
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

          log.info(
              "Quick plan generated successfully via Gemini for: {}",
              request.destinationProvince());
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
                actNode.has("placeName") ? actNode.get("placeName").asText() : "Điểm tham quan";
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
    String dest =
        request.destinationProvince() != null ? request.destinationProvince().trim() : "Đà Nẵng";
    List<SuggestedDayResponse> suggestedDays = new ArrayList<>();

    if (dest.contains("Đà Nẵng") || dest.contains("Da Nang")) {
      suggestedDays.add(
          new SuggestedDayResponse(
              1,
              "Ngày 1 — Chạm biển, khám phá Bán đảo Sơn Trà",
              List.of(
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "MORNING",
                      "Chùa Linh Ứng – Bãi Bụt (Bán đảo Sơn Trà)",
                      BigDecimal.ZERO,
                      "Tham quan",
                      "Ngắm cảnh biển từ bán đảo Sơn Trà và khám phá không gian thanh tịnh."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "NOON",
                      "Bữa trưa với đặc sản Đà Nẵng (Mì Quảng & Bánh tráng)",
                      BigDecimal.valueOf(120000),
                      "Ẩm thực",
                      "Thưởng thức mì Quảng hoặc bánh tráng cuốn thịt heo tại quán địa phương."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "AFTERNOON",
                      "Một chiều thảnh thơi ở biển Mỹ Khê",
                      BigDecimal.valueOf(60000),
                      "Biển & nghỉ dưỡng",
                      "Dạo biển, thư giãn và ngắm hoàng hôn cùng bạn đồng hành."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "EVENING",
                      "Dạo bờ sông Hàn, Cầu Rồng & Chợ đêm",
                      BigDecimal.valueOf(250000),
                      "Khám phá buổi tối",
                      "Khám phá không khí thành phố về đêm và thưởng thức món ăn đường phố."))));
      if (daysCount >= 2) {
        suggestedDays.add(
            new SuggestedDayResponse(
                2,
                "Ngày 2 — Chinh phục Bà Nà Hills & Cầu Vàng",
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Cáp treo đạt kỷ lục thế giới & Dạo bước Cầu Vàng",
                        BigDecimal.valueOf(900000),
                        "Thắng cảnh nổi tiếng",
                        "Chiêm ngưỡng Cầu Vàng bồng bềnh giữa biển mây ngút ngàn."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Buffet Á – Âu tại Làng Pháp Beer Plaza",
                        BigDecimal.valueOf(350000),
                        "Ẩm thực ẩm thực",
                        "Hơn 100 món ăn phong phú giữa không gian kiến trúc Gothic phong cách Pháp."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Lâu Đài Mặt Trăng & Xe Trượt Ống Alpine Coaster",
                        BigDecimal.ZERO,
                        "Giải trí & Trải nghiệm",
                        "Trải nghiệm rạp chiếu phim bay 4D và trò chơi ngoài trời cảm giác mạnh."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Du thuyền sông Hàn ngắm cảnh Tứ đại mỹ cầu",
                        BigDecimal.valueOf(150000),
                        "Du thuyền & Ngắm cảnh",
                        "Lướt êm đềm trên sông Hàn, xem biểu diễn múa Chăm Pa về đêm."))));
      }
      if (daysCount >= 3) {
        suggestedDays.add(
            new SuggestedDayResponse(
                3,
                "Ngày 3 — Danh thắng Ngũ Hành Sơn & Mua sắm Chợ Hàn",
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Khám phá Động Huyền Không & Chùa Tam Thai",
                        BigDecimal.valueOf(40000),
                        "Di tích & Khám phá",
                        "Quần thể 5 ngọn núi đá vôi kỳ vĩ mang tên Ngũ Hành Sơn."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Thưởng thức Bánh xèo nem lụi Bà Dưỡng",
                        BigDecimal.valueOf(90000),
                        "Ẩm thực truyền thống",
                        "Bánh xèo giòn rụm cuốn rau sống với nước chấm gan thịt trứ danh."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Mua sắm đặc sản miền Trung tại Chợ Hàn",
                        BigDecimal.valueOf(100000),
                        "Mua sắm & Check-in",
                        "Khu chợ sầm uất với các đặc sản chả bò, mắm nêm, đồ lưu niệm."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Thư thả Cà phê ngắm cầu Thuận Phước lộng gió",
                        BigDecimal.valueOf(50000),
                        "Thư giãn & Chill",
                        "Kết thúc chuyến đi với ly cà phê muối đậm đà bên cửa biển."))));
      }
    } else if (dest.contains("Hà Nội") || dest.contains("Hanoi")) {
      suggestedDays.add(
          new SuggestedDayResponse(
              1,
              "Ngày 1 — Tinh hoa Cố Đô: Hồ Gươm, Phố Cổ & Văn Miếu",
              List.of(
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "MORNING",
                      "Hồ Hoàn Kiếm, Tháp Rùa & Đền Ngọc Sơn",
                      BigDecimal.valueOf(30000),
                      "Di tích & Văn hóa",
                      "Dạo quanh hồ Gươm buổi sớm mai và chụp ảnh kỷ niệm cầu Thê Húc."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "NOON",
                      "Bún chả gia truyền & Nem cua bể Phố Cổ",
                      BigDecimal.valueOf(80000),
                      "Ẩm thực phố cổ",
                      "Thưởng thức bún chả nướng than hoa thơm lừng đậm đà vị Bắc."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "AFTERNOON",
                      "Văn Miếu - Quốc Tử Giám & Hoàng thành Thăng Long",
                      BigDecimal.valueOf(140000),
                      "Di tích & Lịch sử",
                      "Trường đại học đầu tiên của Việt Nam với 82 bia tiến sĩ cổ."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "EVENING",
                      "Dạo chơi Phố đi bộ 36 Phố Phường & Cà phê Trứng",
                      BigDecimal.valueOf(80000),
                      "Văn hóa & Phố đêm",
                      "Thưởng thức cà phê trứng Giảng trứ danh và không khí phố đêm nhộn nhịp."))));
      if (daysCount >= 2) {
        suggestedDays.add(
            new SuggestedDayResponse(
                2,
                "Ngày 2 — Ba Đình lịch sử, Hồ Tây & Chùa Trấn Quốc",
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Quảng trường Ba Đình, Lăng Bác & Chùa Một Cột",
                        BigDecimal.ZERO,
                        "Di tích & Lịch sử",
                        "Chiêm ngưỡng kiến trúc chùa Một Cột độc đáo thời Lý."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Chả cá Lã Vọng nức tiếng kinh kỳ",
                        BigDecimal.valueOf(180000),
                        "Ẩm thực truyền thống",
                        "Cá lăng nướng vàng ươm ăn kèm bún tươi, thì là, đậu phộng rang."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Ngắm hoàng hôn Hồ Tây & Viếng Chùa Trấn Quốc",
                        BigDecimal.ZERO,
                        "Tâm linh & Cảnh quan",
                        "Ngôi chùa cổ nhất Thăng Long hơn 1500 năm tuổi giữa làn nước biếc."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Khám phá Nhà tù Hỏa Lò tour đêm lịch sử",
                        BigDecimal.valueOf(150000),
                        "Bảo tàng & Lịch sử",
                        "Trải nghiệm cảm xúc thiêng liêng tại di tích lịch sử Hỏa Lò."))));
      }
    } else if (dest.contains("Hội An") || dest.contains("Hoi An")) {
      suggestedDays.add(
          new SuggestedDayResponse(
              1,
              "Ngày 1 — Sắc màu Phố Cổ Hội An & Đèn lồng Sông Hoài",
              List.of(
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "MORNING",
                      "Chùa Cầu, Nhà cổ Tấn Ký & Hội quán Phúc Kiến",
                      BigDecimal.valueOf(120000),
                      "Di sản UNESCO",
                      "Kiến trúc đô thị cổ được bảo tồn nguyên vẹn ven sông Thu Bồn."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "NOON",
                      "Cơm gà Bà Buội & Bánh mì Phượng",
                      BigDecimal.valueOf(75000),
                      "Ẩm thực phố Hội",
                      "Cơm gà vàng óng nghệ tươi và bánh mì giòn rụm nức tiếng thế giới."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "AFTERNOON",
                      "Chèo thuyền thúng Rừng dừa Bảy Mẫu Cẩm Thanh",
                      BigDecimal.valueOf(150000),
                      "Sinh thái & Trải nghiệm",
                      "Khám phá rừng dừa bạt ngàn và xem nghệ nhân biểu diễn múa thúng xoay."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "EVENING",
                      "Thả hoa đăng ước nguyện trên sông Hoài & Chợ đêm",
                      BigDecimal.valueOf(80000),
                      "Đêm phố cổ",
                      "Trải nghiệm đi thuyền hoa đăng lung linh và mua quà lưu niệm thủ công."))));
    } else if (dest.contains("Phú Quốc") || dest.contains("Phu Quoc")) {
      suggestedDays.add(
          new SuggestedDayResponse(
              1,
              "Ngày 1 — Bắc Đảo: Grand World, Vinpearl Safari & Bún Quậy",
              List.of(
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "MORNING",
                      "Grand World Phú Quốc & Kênh đào Venice",
                      BigDecimal.ZERO,
                      "Check-in & Cảnh quan",
                      "Dạo bước 'thành phố không ngủ' rực rỡ sắc màu và chụp ảnh bên dòng sông Venice."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "NOON",
                      "Bún Quậy Kiến Xây trứ danh Phú Quốc",
                      BigDecimal.valueOf(65000),
                      "Ẩm thực bản địa",
                      "Tự tay pha chén nước chấm chua ngọt độc đáo ăn kèm bún hải sản nóng hổi."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "AFTERNOON",
                      "Công viên chăm sóc & bảo tồn bán hoang dã Vinpearl Safari",
                      BigDecimal.valueOf(650000),
                      "Khám phá & Sinh thái",
                      "Trải nghiệm 'nhốt người thả thú' độc đáo ngắm nhìn muôn loài thú quý hiếm."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "EVENING",
                      "Dạo Chợ đêm Phú Quốc & Hải sản tươi sống",
                      BigDecimal.valueOf(250000),
                      "Ẩm thực & Phố đêm",
                      "Thưởng thức hải sản nướng mỡ hành, kem cuộn Thái và mua quà lưu niệm tiêu ngào đường."))));
      if (daysCount >= 2) {
        suggestedDays.add(
            new SuggestedDayResponse(
                2,
                "Ngày 2 — Nam Đảo: Cáp treo Hòn Thơm, Bãi Sao & Cầu Hôn",
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Cáp treo vượt biển Hòn Thơm Sun World",
                        BigDecimal.valueOf(650000),
                        "Trải nghiệm kỷ lục",
                        "Ngắm toàn cảnh biển ngọc Nam Đảo từ tuyến cáp treo 3 dây vượt biển dài nhất thế giới."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Hải sản tươi sống Làng chài Hàm Ninh",
                        BigDecimal.valueOf(200000),
                        "Ẩm thực biển đảo",
                        "Thưởng thức ghẹ Hàm Ninh tươi ngọt chắc thịt, gỏi cá trích và tôm mũ ni."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Tắm biển Bãi Sao & Check-in Sunset Sanato",
                        BigDecimal.valueOf(100000),
                        "Biển & Thiên nhiên",
                        "Thả mình trên bãi cát trắng mịn như kem và chụp ảnh cùng đàn voi bay trên biển."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Ngắm hoàng hôn Thị trấn Hoàng Hôn & Cầu Hôn (Kiss Bridge)",
                        BigDecimal.valueOf(150000),
                        "Cảnh quan & Check-in",
                        "Chiêm ngưỡng kiệt tác kiến trúc Cầu Hôn và show biểu diễn ánh sáng Kiss of the Sea."))));
      }
      if (daysCount >= 3) {
        suggestedDays.add(
            new SuggestedDayResponse(
                3,
                "Ngày 3 — Di tích lịch sử, Làng nghề & Chill hoàng hôn Bãi Trường",
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Di tích Lịch sử Nhà tù Phú Quốc & Nhà thùng Nước mắm",
                        BigDecimal.valueOf(20000),
                        "Lịch sử & Di sản",
                        "Tìm hiểu di tích lịch sử anh hùng và quy trình ủ chượp nước mắm cá cơm 40 độ đạm trứ danh."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Bữa trưa đặc sản Gỏi cá trích & Rượu sim rừng",
                        BigDecimal.valueOf(150000),
                        "Ẩm thực truyền thống",
                        "Gỏi cá trích cuốn bánh tráng, dừa nạo và rau rừng chấm nước mắm ớt hiểm."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Vườn tiêu Suối Đá & Suối Tranh",
                        BigDecimal.valueOf(30000),
                        "Sinh thái & Khám phá",
                        "Dạo bước giữa rừng tiêu trĩu quả và tắm dòng suối trong vắt giữa thiên nhiên."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Thư giãn Cocktail ngắm hoàng hôn OCSEN Beach Bar",
                        BigDecimal.valueOf(120000),
                        "Thư giãn & Chill",
                        "Ngồi ghế lười bên bờ biển nghe nhạc acoustic và ngắm hoàng hôn rực đỏ buông xuống biển Tây."))));
      }
    } else {
      // Dynamic fallback for any other destination
      for (int day = 1; day <= daysCount; day++) {
        suggestedDays.add(
            new SuggestedDayResponse(
                day,
                "Ngày " + day + " — Khám phá & Trải nghiệm " + dest,
                List.of(
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "MORNING",
                        "Khám phá danh thắng nổi tiếng (" + dest + ")",
                        BigDecimal.valueOf(100000),
                        "Cảnh quan & Văn hóa",
                        "Khởi đầu ngày mới với không khí trong lành và chụp ảnh lưu niệm."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "NOON",
                        "Thưởng thức đặc sản trứ danh địa phương",
                        BigDecimal.valueOf(120000),
                        "Ẩm thực đặc sản",
                        "Trải nghiệm ẩm thực phong phú với hương vị truyền thống."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "AFTERNOON",
                        "Trải nghiệm thiên nhiên & Điểm check-in nổi bật",
                        BigDecimal.valueOf(80000),
                        "Tham quan & Trải nghiệm",
                        "Thư giãn, tận hưởng cảnh quan và tìm hiểu văn hóa bản địa."),
                    new SuggestedActivityResponse(
                        UUID.randomUUID(),
                        "EVENING",
                        "Dạo phố đêm, chợ đêm & Khám phá ẩm thực đường phố",
                        BigDecimal.valueOf(200000),
                        "Giải trí & Phố đêm",
                        "Hòa mình vào nhịp sống về đêm và mua sắm quà kỷ niệm."))));
      }
    }

    // Ensure daysCount matches requested days
    while (suggestedDays.size() < daysCount) {
      int nextDay = suggestedDays.size() + 1;
      suggestedDays.add(
          new SuggestedDayResponse(
              nextDay,
              "Ngày " + nextDay + " — Thư giãn & Khám phá (" + dest + ")",
              List.of(
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "MORNING",
                      "Tham quan làng nghề truyền thống & Check-in",
                      BigDecimal.valueOf(80000),
                      "Văn hóa & Trải nghiệm",
                      "Giao lưu cùng người dân địa phương và chụp ảnh kỷ niệm."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "NOON",
                      "Bữa trưa tại nhà hàng địa phương",
                      BigDecimal.valueOf(120000),
                      "Ẩm thực ẩm thực",
                      "Thưởng thức các món ngon đậm đà bản sắc."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "AFTERNOON",
                      "Mua sắm quà lưu niệm & Thư giãn cà phê",
                      BigDecimal.valueOf(100000),
                      "Mua sắm & Thư giãn",
                      "Chọn mua đặc sản làm quà cho người thân và bạn bè."),
                  new SuggestedActivityResponse(
                      UUID.randomUUID(),
                      "EVENING",
                      "Tiệc tối chia tay & Ngắm cảnh thành phố về đêm",
                      BigDecimal.valueOf(250000),
                      "Khám phá buổi tối",
                      "Khép lại hành trình với những kỷ niệm đáng nhớ."))));
    }

    return new AiItinerarySuggestionResponse(
        dest,
        daysCount,
        request.budgetLevel() != null ? request.budgetLevel() : "MEDIUM",
        budgetVnd,
        true,
        suggestedDays);
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
