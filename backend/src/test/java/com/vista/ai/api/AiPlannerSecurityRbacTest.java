package com.vista.ai.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.ai.api.dto.AiItinerarySuggestionRequest;
import com.vista.ai.api.dto.RouteOptimizationRequest;
import com.vista.ai.config.AiRateLimiter;
import com.vista.ai.provider.AiProviderRouter;
import com.vista.budget.util.RouteOptimizer.DestinationPoint;
import com.vista.common.audit.AuditLogService;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.trip.application.TripAccessService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
class AiPlannerSecurityRbacTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private TripAccessService tripAccessService;
  @MockitoBean private CurrentUserProvider currentUserProvider;
  @MockitoBean private AiRateLimiter aiRateLimiter;
  @MockitoBean private AiProviderRouter aiProviderRouter;
  @MockitoBean private AuditLogService auditLogService;
  @MockitoBean private DestinationQueryService destinationQueryService;

  private UUID tripId;
  private UUID currentUserId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    currentUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
    when(aiProviderRouter.isAvailable()).thenReturn(false);
    when(destinationQueryService.searchPublished(
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyInt()))
        .thenReturn(
            List.of(
                new DestinationSummary(
                    UUID.fromString("11111111-1111-1111-1111-111111111111"),
                    "Điểm đến đã duyệt",
                    "Huế",
                    "Văn hóa",
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    16.4637,
                    107.5909)));
  }

  @Test
  @DisplayName("1. [RBAC] Chặn người ngoài (outsider) yêu cầu gợi ý lịch trình AI -> 403 Forbidden")
  void aiSuggestions_shouldDeny_whenUserIsOutsider() throws Exception {
    doThrow(new AccessDeniedException("User is not a member of trip"))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Nha Trang", 2, "LOW", List.of("Biển"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());

    verify(auditLogService, never()).logAction(any(), any(), any(), any(), any());
  }

  @Test
  @DisplayName(
      "2. [RBAC] Chặn thành viên đã bị REMOVED yêu cầu gợi ý lịch trình AI -> 403 Forbidden")
  void aiSuggestions_shouldDeny_whenUserIsRemovedMember() throws Exception {
    doThrow(new AccessDeniedException("Thành viên không còn ở trạng thái ACTIVE"))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Đà Lạt", 3, "MEDIUM", List.of("Hoa"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());

    verify(auditLogService, never()).logAction(any(), any(), any(), any(), any());
  }

  @Test
  @DisplayName("3. [RBAC & Audit] Cho phép thành viên ACTIVE tạo gợi ý AI và ghi Audit Log an toàn")
  void aiSuggestions_shouldAllowActiveMember_andLogAudit() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Huế", 2, "BUDGET", List.of("Di tích"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.destinationProvince").value("Huế"));

    verify(auditLogService)
        .logAction(
            eq(currentUserId),
            eq("AI_PLAN_GENERATE"),
            eq("TRIP"),
            eq(tripId.toString()),
            any(String.class));
  }

  @Test
  @DisplayName(
      "4. [Audit Sanitization] Audit log của AI Planner không chứa raw prompt, Bearer token,"
          + " password hay apiKey")
  void aiSuggestions_auditLog_mustNotContainSensitiveCredentialsOrRawPrompt() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, currentUserId);

    AiItinerarySuggestionRequest request =
        new AiItinerarySuggestionRequest("Phú Quốc", 4, "HIGH", List.of("Resort", "Nghỉ dưỡng"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/itinerary-suggestions", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());

    ArgumentCaptor<String> metadataCaptor = ArgumentCaptor.forClass(String.class);
    verify(auditLogService)
        .logAction(
            eq(currentUserId),
            eq("AI_PLAN_GENERATE"),
            eq("TRIP"),
            eq(tripId.toString()),
            metadataCaptor.capture());

    String metadataJson = metadataCaptor.getValue();
    assertThat(metadataJson).isNotBlank();

    JsonNode node = objectMapper.readTree(metadataJson);
    assertThat(node.has("destinationProvince")).isTrue();
    assertThat(node.get("destinationProvince").asText()).isEqualTo("Phú Quốc");
    assertThat(node.has("daysCount")).isTrue();
    assertThat(node.get("daysCount").asInt()).isEqualTo(4);
    assertThat(node.has("budgetLevel")).isTrue();
    assertThat(node.get("budgetLevel").asText()).isEqualTo("HIGH");

    // Negative verification: ensure no sensitive keys or leaked credentials exist
    assertThat(metadataJson).doesNotContainIgnoringCase("prompt");
    assertThat(metadataJson).doesNotContainIgnoringCase("bearer");
    assertThat(metadataJson).doesNotContainIgnoringCase("apikey");
    assertThat(metadataJson).doesNotContainIgnoringCase("password");
    assertThat(metadataJson).doesNotContainIgnoringCase("secret");
  }

  @Test
  @DisplayName(
      "5. [RBAC] Chặn người ngoài (outsider) tối ưu hóa lộ trình (optimize-route) -> 403 Forbidden")
  void optimizeRoute_shouldDeny_whenUserIsOutsider() throws Exception {
    doThrow(new AccessDeniedException("User is not a member of trip"))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    DestinationPoint hotel = new DestinationPoint(UUID.randomUUID(), "Khách sạn X", 10.0, 106.0);
    DestinationPoint spot =
        new DestinationPoint(UUID.randomUUID(), "Điểm tham quan Y", 10.1, 106.1);
    RouteOptimizationRequest request = new RouteOptimizationRequest(hotel, List.of(spot));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/optimize-route", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName(
      "6. [RBAC] Chặn thành viên REMOVED tối ưu hóa lộ trình (optimize-route) -> 403 Forbidden")
  void optimizeRoute_shouldDeny_whenUserIsRemovedMember() throws Exception {
    doThrow(new AccessDeniedException("Thành viên không còn ở trạng thái ACTIVE"))
        .when(tripAccessService)
        .requireMember(tripId, currentUserId);

    DestinationPoint hotel = new DestinationPoint(UUID.randomUUID(), "Khách sạn A", 10.0, 106.0);
    DestinationPoint spot = new DestinationPoint(UUID.randomUUID(), "Điểm B", 10.1, 106.1);
    RouteOptimizationRequest request = new RouteOptimizationRequest(hotel, List.of(spot));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/ai/optimize-route", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }
}
