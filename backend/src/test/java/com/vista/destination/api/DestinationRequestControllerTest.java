package com.vista.destination.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.destination.api.dto.DestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestPageDto;
import com.vista.destination.api.dto.DestinationRequestStatsDto;
import com.vista.destination.api.dto.RejectDestinationRequestDto;
import com.vista.destination.api.dto.SubmitDestinationRequestDto;
import com.vista.destination.service.DestinationRequestService;
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

@WebMvcTest({DestinationRequestController.class, AdminDestinationRequestController.class})
@Import({SecurityConfiguration.class, GlobalExceptionHandler.class})
@DisplayName("DestinationRequest & AdminDestinationRequest Security & REST API Tests")
class DestinationRequestControllerTest {

  @Autowired MockMvc mvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean DestinationRequestService requestService;
  @MockitoBean CurrentUserProvider currentUserProvider;

  private DestinationRequestDto sampleDto(UUID id, String type, String status) {
    return new DestinationRequestDto(
        id,
        type,
        null,
        null,
        UUID.randomUUID(),
        "Nguyễn Văn A",
        "Đỉnh Bàn Cờ",
        "Đà Nẵng",
        "Cảnh quan",
        "Ngắm toàn cảnh Đà Nẵng",
        "Sơn Trà, Đà Nẵng",
        16.119,
        108.285,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        Map.of(),
        List.of(),
        null,
        "Địa điểm nổi tiếng",
        status,
        null,
        null,
        null,
        null,
        Instant.now(),
        Instant.now(),
        null);
  }

  @Test
  @DisplayName("POST /api/v1/destination-requests without auth returns 401")
  void submitUnauthenticatedReturns401() throws Exception {
    mvc.perform(
            post("/api/v1/destination-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("POST /api/v1/destination-requests as USER returns 201")
  void submitAsUserReturns201() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID reqId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    when(requestService.submitRequest(eq(userId), any()))
        .thenReturn(sampleDto(reqId, "CREATE", "PENDING"));

    var payload =
        new SubmitDestinationRequestDto(
            "CREATE",
            null,
            "Đỉnh Bàn Cờ",
            "Đà Nẵng",
            "Cảnh quan",
            "Ngắm toàn cảnh Đà Nẵng",
            null,
            new BigDecimal("16.119"),
            new BigDecimal("108.285"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            null,
            null,
            null,
            "Địa điểm nổi tiếng");

    mvc.perform(
            post("/api/v1/destination-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(reqId.toString()))
        .andExpect(jsonPath("$.status").value("PENDING"));
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("GET /api/v1/destination-requests/me as USER returns 200")
  void getMyRequestsAsUserReturns200() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    when(requestService.getMyRequests(eq(userId), any(), anyInt(), anyInt()))
        .thenReturn(
            new DestinationRequestPageDto(
                List.of(sampleDto(UUID.randomUUID(), "CREATE", "PENDING")), 0, 20, 1));

    mvc.perform(get("/api/v1/destination-requests/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].name").value("Đỉnh Bàn Cờ"));
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("GET /api/v1/admin/destination-requests as USER returns 403 Forbidden")
  void adminQueueAsUserReturns403() throws Exception {
    mvc.perform(get("/api/v1/admin/destination-requests")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("GET /api/v1/admin/destination-requests/stats as ADMIN returns 200")
  void adminStatsAsAdminReturns200() throws Exception {
    when(requestService.getStats()).thenReturn(new DestinationRequestStatsDto(3, 5, 1, 9));

    mvc.perform(get("/api/v1/admin/destination-requests/stats"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pending").value(3))
        .andExpect(jsonPath("$.total").value(9));
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("PUT /api/v1/admin/destination-requests/{id}/approve as MODERATOR returns 200")
  void adminApproveAsModeratorReturns200() throws Exception {
    UUID reqId = UUID.randomUUID();
    UUID modId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(modId);
    when(requestService.approveRequest(eq(reqId), eq(modId), any()))
        .thenReturn(sampleDto(reqId, "CREATE", "APPROVED"));

    mvc.perform(put("/api/v1/admin/destination-requests/" + reqId + "/approve"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("PUT /api/v1/admin/destination-requests/{id}/reject validates reason length (400)")
  void adminRejectShortReasonReturns400() throws Exception {
    UUID reqId = UUID.randomUUID();
    var body = new RejectDestinationRequestDto("Ngắn quá");

    mvc.perform(
            put("/api/v1/admin/destination-requests/" + reqId + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("PUT /api/v1/admin/destination-requests/{id}/reject with valid reason returns 200")
  void adminRejectValidReasonReturns200() throws Exception {
    UUID reqId = UUID.randomUUID();
    UUID modId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(modId);
    when(requestService.rejectRequest(eq(reqId), eq(modId), any()))
        .thenReturn(sampleDto(reqId, "UPDATE", "REJECTED"));

    var body = new RejectDestinationRequestDto("Thông tin giá vé chưa có nguồn xác thực rõ ràng");

    mvc.perform(
            put("/api/v1/admin/destination-requests/" + reqId + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REJECTED"));
  }
}
