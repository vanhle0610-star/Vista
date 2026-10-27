package com.vista.destination.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationStatusUpdateRequest;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminDestinationController.class)
@Import({SecurityConfiguration.class, GlobalExceptionHandler.class})
@DisplayName("AdminDestinationController WebMvc Security & REST API Tests")
class AdminDestinationControllerTest {

  @Autowired MockMvc mvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean DestinationService destinationService;
  @MockitoBean CurrentUserProvider currentUserProvider;

  private DestinationDetailDto createSampleDetailDto(UUID id, String status) {
    return new DestinationDetailDto(
        id,
        "Chùa Linh Ứng Bãi Bụt",
        "Đà Nẵng",
        "Tâm linh & Cảnh quan",
        "https://example.com/linh-ung.jpg",
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        16.1032,
        108.2778,
        status,
        "Chùa tọa lạc trên bán đảo Sơn Trà",
        Map.of("mon", "06:00-21:00"),
        "https://danang.gov.vn",
        Instant.now(),
        false);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("GET /api/v1/admin/destinations: ADMIN role returns 200 and page results")
  void getModerationQueueAsAdminReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    var summary =
        new DestinationSummaryDto(
            id,
            "Bãi Rạn Nam Ô",
            "Đà Nẵng",
            "Thiên nhiên",
            "https://example.com/nam-o.jpg",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            16.1234,
            108.1234,
            "DRAFT");
    var pageDto = new DestinationPageDto(List.of(summary), 0, 20, 1L);

    when(destinationService.searchModerationQueue(any(), any(), any(), any(), anyInt(), anyInt()))
        .thenReturn(pageDto);

    mvc.perform(get("/api/v1/admin/destinations?status=DRAFT"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(id.toString()))
        .andExpect(jsonPath("$.items[0].name").value("Bãi Rạn Nam Ô"))
        .andExpect(jsonPath("$.items[0].status").value("DRAFT"))
        .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("GET /api/v1/admin/destinations: MODERATOR role returns 200")
  void getModerationQueueAsModeratorReturns200() throws Exception {
    var pageDto = new DestinationPageDto(List.of(), 0, 20, 0L);

    when(destinationService.searchModerationQueue(any(), any(), any(), any(), anyInt(), anyInt()))
        .thenReturn(pageDto);

    mvc.perform(get("/api/v1/admin/destinations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isArray())
        .andExpect(jsonPath("$.total").value(0));
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("GET /api/v1/admin/destinations: USER role is forbidden (403)")
  void getModerationQueueAsRegularUserReturns403() throws Exception {
    mvc.perform(get("/api/v1/admin/destinations")).andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("GET /api/v1/admin/destinations: Anonymous request is unauthorized (401)")
  void getModerationQueueAsAnonymousReturns401() throws Exception {
    mvc.perform(get("/api/v1/admin/destinations")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("GET /api/v1/admin/destinations/stats: MODERATOR role returns stats map")
  void getStatsAsModeratorReturns200() throws Exception {
    when(destinationService.getModerationStats())
        .thenReturn(Map.of("total", 100L, "draft", 10L, "published", 85L, "rejected", 5L));

    mvc.perform(get("/api/v1/admin/destinations/stats"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(100))
        .andExpect(jsonPath("$.draft").value(10))
        .andExpect(jsonPath("$.published").value(85))
        .andExpect(jsonPath("$.rejected").value(5));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("GET /api/v1/admin/destinations/{id}: ADMIN role retrieves detail of any status")
  void getDetailAsAdminReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    var detail = createSampleDetailDto(id, "DRAFT");

    when(destinationService.getDestinationAdminDetail(id)).thenReturn(detail);

    mvc.perform(get("/api/v1/admin/destinations/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()))
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.name").value("Chùa Linh Ứng Bãi Bụt"));
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("GET /api/v1/admin/destinations/{id}: Non-existent ID returns 404 ProblemDetail")
  void getDetailNotFoundReturns404() throws Exception {
    UUID missingId = UUID.randomUUID();

    when(destinationService.getDestinationAdminDetail(missingId))
        .thenThrow(new DestinationNotFoundException("Không tìm thấy địa điểm: " + missingId));

    mvc.perform(get("/api/v1/admin/destinations/" + missingId))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("DESTINATION_NOT_FOUND"));
  }

  @Test
  @WithMockUser(
      username = "11111111-1111-1111-1111-111111111111",
      roles = {"MODERATOR"})
  @DisplayName("PUT /api/v1/admin/destinations/{id}/approve: Approves destination to PUBLISHED")
  void approveDestinationAsModeratorReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    UUID moderatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    var approved = createSampleDetailDto(id, "PUBLISHED");

    when(currentUserProvider.getCurrentUserId()).thenReturn(moderatorId);
    when(destinationService.approveDestination(eq(id), any(), anyString())).thenReturn(approved);

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Thông tin hợp lệ\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PUBLISHED"));
  }

  @Test
  @WithMockUser(
      username = "11111111-1111-1111-1111-111111111111",
      roles = {"MODERATOR"})
  @DisplayName("PUT /api/v1/admin/destinations/{id}/reject: Rejects destination to REJECTED")
  void rejectDestinationAsModeratorReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    UUID moderatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    var rejected = createSampleDetailDto(id, "REJECTED");

    when(currentUserProvider.getCurrentUserId()).thenReturn(moderatorId);
    when(destinationService.rejectDestination(eq(id), any(), anyString())).thenReturn(rejected);

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Thiếu ảnh thực tế\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REJECTED"));
  }

  @Test
  @WithMockUser(
      username = "11111111-1111-1111-1111-111111111111",
      roles = {"ADMIN"})
  @DisplayName("PUT /api/v1/admin/destinations/{id}/status: Valid status update returns 200")
  void updateStatusValidReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    UUID adminId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    var updated = createSampleDetailDto(id, "DRAFT");

    when(currentUserProvider.getCurrentUserId()).thenReturn(adminId);
    when(destinationService.updateDestinationStatus(eq(id), eq("DRAFT"), any(), anyString()))
        .thenReturn(updated);

    var request = new DestinationStatusUpdateRequest("DRAFT", "Chuyển về bản nháp để sửa");

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("PUT /api/v1/admin/destinations/{id}/status: Blank status returns 400 Bad Request")
  void updateStatusBlankStatusReturns400() throws Exception {
    UUID id = UUID.randomUUID();
    var request = new DestinationStatusUpdateRequest("", "Ghi chú");

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("PUT /api/v1/admin/destinations/{id}/status: Invalid status name returns 400")
  void updateStatusInvalidStatusReturns400() throws Exception {
    UUID id = UUID.randomUUID();
    UUID moderatorId = UUID.randomUUID();

    when(currentUserProvider.getCurrentUserId()).thenReturn(moderatorId);
    when(destinationService.updateDestinationStatus(eq(id), eq("INVALID_STATUS"), any(), any()))
        .thenThrow(new IllegalArgumentException("Trạng thái không hợp lệ: INVALID_STATUS"));

    var request = new DestinationStatusUpdateRequest("INVALID_STATUS", "Ghi chú");

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_ARGUMENT"));
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("PUT /api/v1/admin/destinations/{id}/approve: USER role is forbidden (403)")
  void approveDestinationAsUserReturns403() throws Exception {
    UUID id = UUID.randomUUID();

    mvc.perform(
            put("/api/v1/admin/destinations/" + id + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Hack\"}"))
        .andExpect(status().isForbidden());
  }
}
