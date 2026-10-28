package com.vista.ai.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.provider.AiProviderRouter;
import com.vista.ai.provider.AiProviderRouter.AiProviderResponse;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AiQuickPlanController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class AiQuickPlanControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private AiProviderRouter aiProviderRouter;
  @MockitoBean private DestinationQueryService destinationQueryService;
  @MockitoBean private com.vista.ai.config.AiRateLimiter aiRateLimiter;

  private final UUID destinationId = UUID.fromString("11111111-1111-1111-1111-111111111111");

  private void givenPublishedDestination() {
    when(destinationQueryService.searchPublished(
            org.mockito.ArgumentMatchers.isNull(),
            anyString(),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyInt()))
        .thenReturn(
            List.of(
                new DestinationSummary(
                    destinationId,
                    "Chùa Linh Ứng - Bãi Bụt",
                    "Đà Nẵng",
                    "Tâm linh",
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    16.1001,
                    108.2778)));
  }

  @Test
  @DisplayName(
      "POST /api/v1/ai/quick-plan public access returns fallback plan when LLM is unavailable")
  void quickPlan_returnsFallback_withoutAuthentication() throws Exception {
    givenPublishedDestination();
    when(aiProviderRouter.isAvailable()).thenReturn(false);

    var request = new AiItinerarySuggestionRequest("Đà Nẵng", 3, "MEDIUM", List.of("Khám phá"));

    mockMvc
        .perform(
            post("/api/v1/ai/quick-plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.destinationProvince").value("Đà Nẵng"))
        .andExpect(jsonPath("$.totalDays").value(3))
        .andExpect(jsonPath("$.isMockData").value(true))
        .andExpect(jsonPath("$.days").isArray())
        .andExpect(jsonPath("$.days.length()").value(3));
  }

  @Test
  @DisplayName("POST /api/v1/ai/quick-plan returns live LLM plan when Gemini returns valid JSON")
  void quickPlan_returnsLiveGeminiPlan() throws Exception {
    givenPublishedDestination();
    when(aiProviderRouter.isAvailable()).thenReturn(true);
    String geminiValidJson =
        """
        ```json
        {
          "tripTitle": "Khám phá Đà Nẵng tuyệt mỹ 2N1Đ",
          "destination": "Đà Nẵng",
          "destinationProvince": "Đà Nẵng",
          "totalDays": 1,
          "estimatedTotalVnd": 3500000,
          "days": [
            {
              "dayNumber": 1,
              "title": "Bình minh biển Mỹ Khê & Bán đảo Sơn Trà",
              "activities": [
                {
                  "destinationId": "11111111-1111-1111-1111-111111111111",
                  "timeSlot": "MORNING",
                  "placeName": "Chùa Linh Ứng - Bãi Bụt",
                  "estimatedCostVnd": 150000,
                  "activityDescription": "Chiêm bái tượng Phật Bà Quan Âm 67m ngắm vịnh Đà Nẵng"
                }
              ]
            }
          ]
        }
        ```
        """;
    when(aiProviderRouter.generate(anyString(), anyString()))
        .thenReturn(Optional.of(new AiProviderResponse("local", false, geminiValidJson)));

    var request =
        new AiItinerarySuggestionRequest("Đà Nẵng", 1, "MEDIUM", List.of("Biển", "Văn hóa"));

    mockMvc
        .perform(
            post("/api/v1/ai/quick-plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.destinationProvince").value("Đà Nẵng"))
        .andExpect(jsonPath("$.totalDays").value(1))
        .andExpect(jsonPath("$.isMockData").value(false))
        .andExpect(jsonPath("$.provider").value("local"))
        .andExpect(jsonPath("$.fallbackUsed").value(false))
        .andExpect(
            jsonPath("$.days[0].activities[0].destinationName").value("Chùa Linh Ứng - Bãi Bụt"));
  }
}
