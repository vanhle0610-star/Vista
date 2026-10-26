package com.vista.ai.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.RouteOptimizationRequest;
import com.vista.ai.client.AiClientWrapper;
import com.vista.ai.config.AiRateLimiter;
import com.vista.budget.util.RouteOptimizer.DestinationPoint;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.trip.application.TripAccessService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AiPlannerController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class AiPlannerControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private TripAccessService tripAccessService;
  @MockitoBean private CurrentUserProvider currentUserProvider;
  @MockitoBean private AiRateLimiter aiRateLimiter;
  @MockitoBean private AiClientWrapper aiClientWrapper;

  private UUID tripId;
  private UUID currentUserId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    currentUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
    when(aiClientWrapper.isAvailable()).thenReturn(false);
  }

  @Test
  @DisplayName("1. Gợi ý lịch trình AI fallback thành công cho thành viên chuyến đi (200 OK)")
  void getItinerarySuggestions_shouldReturn200Fallback() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Đà Nẵng", 3, "MEDIUM", List.of("Biển", "Ẩm thực"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.destinationProvince").value("Đà Nẵng"))
        .andExpect(jsonPath("$.totalDays").value(3))
        .andExpect(jsonPath("$.isMockData").value(true))
        .andExpect(jsonPath("$.days").isArray())
        .andExpect(jsonPath("$.days[0].activities").isArray());
  }

  @Test
  @DisplayName("2. Chặn 403 Forbidden khi người dùng không thuộc chuyến đi")
  void getItinerarySuggestions_shouldReturn403_whenNotMember() throws Exception {
    doThrow(new AccessDeniedException("Forbidden"))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Đà Nẵng", 3, "MEDIUM", List.of("Biển"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("3. Báo lỗi 400 Bad Request khi số ngày vượt quá giới hạn 7 ngày")
  void getItinerarySuggestions_shouldReturn400_whenDaysExceedLimit() throws Exception {
    AiItinerarySuggestionRequest invalidRequest =
        new AiItinerarySuggestionRequest("Đà Nẵng", 10, "MEDIUM", List.of("Biển")); // max = 7

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Validation failed"));
  }

  @Test
  @DisplayName("4. Chặn 429 Too Many Requests khi người dùng vượt quá 5 lượt gọi AI trong ngày")
  void getItinerarySuggestions_shouldReturn429_whenRateLimitExceeded() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);
    doThrow(
            new com.vista.auth.exception.RateLimitExceededException(
                "Bạn đã sử dụng hết 5 lượt gợi ý AI trong ngày hôm nay. Vui lòng quay lại vào ngày mai.",
                3600))
        .when(aiRateLimiter)
        .checkAndConsume(currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Đà Nẵng", 3, "MEDIUM", List.of("Biển"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.title").value("Too Many Requests"))
        .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"));
  }

  @Test
  @DisplayName("5. Tối ưu hóa lộ trình các điểm đến thành công (200 OK)")
  void optimizeRoute_shouldReturn200() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    DestinationPoint hotel =
        new DestinationPoint(UUID.randomUUID(), "Khách sạn Novotel", 16.0778, 108.2241);
    DestinationPoint spot1 =
        new DestinationPoint(UUID.randomUUID(), "Chùa Linh Ứng", 16.1001, 108.2778);
    DestinationPoint spot2 = new DestinationPoint(UUID.randomUUID(), "Cầu Rồng", 16.0611, 108.2208);

    RouteOptimizationRequest request = new RouteOptimizationRequest(hotel, List.of(spot1, spot2));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/optimize-route", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.orderedRoute").isArray())
        .andExpect(jsonPath("$.orderedRoute.length()").value(2))
        .andExpect(jsonPath("$.totalDistanceKm").isNumber())
        .andExpect(jsonPath("$.estimatedTaxiCostVnd").isNumber());
  }

  @Test
  @DisplayName(
      "6. Gợi ý lịch trình thành công với Live Gemini AI khi có API key (isMockData = false)")
  void getItinerarySuggestions_shouldReturnLiveAiData() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);
    when(aiClientWrapper.isAvailable()).thenReturn(true);

    String mockGeminiJson =
        """
        {
          "tripTitle": "Hành trình khám phá Đà Nẵng",
          "destination": "Đà Nẵng",
          "totalDays": 2,
          "estimatedTotalVnd": 2800000,
          "days": [
            {
              "dayNumber": 1,
              "title": "Ngày 1: Biển & Bán đảo Sơn Trà",
              "estimatedDayCostVnd": 1400000,
              "activities": [
                {
                  "timeSlot": "MORNING",
                  "placeName": "Chùa Linh Ứng",
                  "activityDescription": "Chiêm bái tượng Phật Bà Quan Âm cao 67m",
                  "estimatedCostVnd": 100000,
                  "latitude": 16.1001,
                  "longitude": 108.2778
                }
              ]
            }
          ]
        }
        """;
    when(aiClientWrapper.generateContent(anyString())).thenReturn(Optional.of(mockGeminiJson));

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Đà Nẵng", 2, "MEDIUM", List.of("Biển", "Tâm linh"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.destinationProvince").value("Đà Nẵng"))
        .andExpect(jsonPath("$.isMockData").value(false))
        .andExpect(jsonPath("$.days[0].activities[0].destinationName").value("Chùa Linh Ứng"));
  }
}
