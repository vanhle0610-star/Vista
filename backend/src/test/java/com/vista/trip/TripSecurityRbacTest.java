package com.vista.trip;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.trip.api.TripController;
import com.vista.trip.api.dto.CreateTripRequest;
import com.vista.trip.api.dto.TransferOwnerRequest;
import com.vista.trip.api.dto.TripResponse;
import com.vista.trip.api.dto.UpdateTripRequest;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.application.TripService;
import com.vista.trip.domain.TripStatus;
import com.vista.trip.domain.TripVisibility;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {TripController.class})
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class TripSecurityRbacTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private TripService tripService;
  @MockitoBean private TripAccessService tripAccessService;
  @MockitoBean private CurrentUserProvider currentUserProvider;
  @MockitoBean private JdbcClient jdbcClient;

  private UUID tripId;
  private UUID actorId;
  private UUID targetUserId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    actorId = UUID.randomUUID();
    targetUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(actorId);
  }

  private TripResponse buildMockTripResponse(UUID tripId, UUID ownerId, String title) {
    return new TripResponse(
        tripId,
        ownerId,
        title,
        LocalDate.now(),
        LocalDate.now().plusDays(2),
        "Đà Nẵng",
        BigDecimal.valueOf(1000000),
        "VND",
        TripStatus.PLANNING,
        TripVisibility.PUBLIC,
        List.of(),
        Instant.now(),
        Instant.now());
  }

  // ==========================================
  // ROLE 1: GUEST / UNAUTHENTICATED
  // ==========================================

  @Test
  @DisplayName("1.1. Guest (chưa xác thực) gọi GET /api/v1/trips/{id} -> 401 UNAUTHORIZED")
  void guest_accessTrip_rejected_with_401() throws Exception {
    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  @DisplayName("1.2. Guest (chưa xác thực) gọi POST /api/v1/trips -> 401 UNAUTHORIZED")
  void guest_createTrip_rejected_with_401() throws Exception {
    var req =
        new CreateTripRequest(
            "Chuyến đi Đà Nẵng",
            LocalDate.now(),
            LocalDate.now().plusDays(3),
            "Đà Nẵng",
            null,
            "VND");
    mockMvc
        .perform(
            post("/api/v1/trips")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  // ==========================================
  // ROLE 2: REGISTERED USER / OUTSIDER
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName("2.1. Outsider gọi GET /api/v1/trips/{id} -> 403 FORBIDDEN")
  void outsider_getTrip_rejected_with_403() throws Exception {
    doThrow(
            new AccessDeniedException(
                "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripService)
        .getTrip(tripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("2.2. Outsider gọi PATCH /api/v1/trips/{id} -> 403 FORBIDDEN")
  void outsider_updateTrip_rejected_with_403() throws Exception {
    var req = new UpdateTripRequest("Sửa tên lén", null, null, null, null, null, null, null);
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripService)
        .updateTrip(eq(tripId), eq(actorId), any());

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("2.3. Outsider gọi DELETE /api/v1/trips/{id} -> 403 FORBIDDEN")
  void outsider_deleteTrip_rejected_with_403() throws Exception {
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripService)
        .deleteTrip(tripId, actorId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("2.4. Outsider gọi GET /api/v1/trips/{id}/members -> 403 FORBIDDEN")
  void outsider_getTripMembers_rejected_with_403() throws Exception {
    doThrow(
            new AccessDeniedException(
                "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripAccessService)
        .requireMember(tripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/members", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  // ==========================================
  // ROLE 3: VIEWER
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName("3.1. Viewer có quyền đọc chuyến đi (GET /api/v1/trips/{id} -> 200 OK)")
  void viewer_getTrip_allowed_with_200() throws Exception {
    var tripRes = buildMockTripResponse(tripId, actorId, "Đà Nẵng Hè");
    when(tripService.getTrip(tripId, actorId)).thenReturn(tripRes);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Đà Nẵng Hè"));
  }

  @Test
  @WithMockUser
  @DisplayName("3.2. Viewer không có quyền cập nhật chuyến đi (PATCH -> 403 FORBIDDEN)")
  void viewer_updateTrip_rejected_with_403() throws Exception {
    var req = new UpdateTripRequest("Viewer cố đổi tên", null, null, null, null, null, null, null);
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripService)
        .updateTrip(eq(tripId), eq(actorId), any());

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("3.3. Viewer không có quyền xóa chuyến đi (DELETE -> 403 FORBIDDEN)")
  void viewer_deleteTrip_rejected_with_403() throws Exception {
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripService)
        .deleteTrip(tripId, actorId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  // ==========================================
  // ROLE 4: EDITOR
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName("4.1. Editor có quyền đọc chuyến đi (GET /api/v1/trips/{id} -> 200 OK)")
  void editor_getTrip_allowed_with_200() throws Exception {
    var tripRes = buildMockTripResponse(tripId, UUID.randomUUID(), "Hội An Phố Cổ");
    when(tripService.getTrip(tripId, actorId)).thenReturn(tripRes);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Hội An Phố Cổ"));
  }

  @Test
  @WithMockUser
  @DisplayName(
      "4.2. Editor không thể cập nhật thông tin chuyến đi cốt lõi (PATCH -> 403 FORBIDDEN)")
  void editor_updateTrip_rejected_with_403() throws Exception {
    var req = new UpdateTripRequest("Editor đổi tiêu đề", null, null, null, null, null, null, null);
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripService)
        .updateTrip(eq(tripId), eq(actorId), any());

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("4.3. Editor không thể chuyển quyền Chủ sở hữu (transfer-owner -> 403 FORBIDDEN)")
  void editor_transferOwner_rejected_with_403() throws Exception {
    var req = new TransferOwnerRequest(targetUserId);
    doThrow(new AccessDeniedException("Chỉ Owner hiện tại mới có quyền chuyển giao quyền sở hữu"))
        .when(tripService)
        .transferOwner(eq(tripId), eq(actorId), eq(targetUserId));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/transfer-owner", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  // ==========================================
  // ROLE 5: OWNER
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName("5.1. Owner cập nhật chuyến đi thành công (PATCH -> 200 OK)")
  void owner_updateTrip_allowed_with_200() throws Exception {
    var req = new UpdateTripRequest("Đà Nẵng Nắng Đẹp", null, null, null, null, null, null, null);
    var updated = buildMockTripResponse(tripId, actorId, "Đà Nẵng Nắng Đẹp");
    when(tripService.updateTrip(eq(tripId), eq(actorId), any())).thenReturn(updated);

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Đà Nẵng Nắng Đẹp"));
  }

  @Test
  @WithMockUser
  @DisplayName("5.2. Owner chuyển quyền sở hữu thành công (POST transfer-owner -> 200 OK)")
  void owner_transferOwner_allowed_with_200() throws Exception {
    var req = new TransferOwnerRequest(targetUserId);
    var updated = buildMockTripResponse(tripId, targetUserId, "Đà Nẵng");
    when(tripService.transferOwner(tripId, actorId, targetUserId)).thenReturn(updated);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/transfer-owner", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ownerId").value(targetUserId.toString()));
  }

  @Test
  @WithMockUser
  @DisplayName("5.3. Owner xóa chuyến đi thành công (DELETE -> 204 No Content)")
  void owner_deleteTrip_allowed_with_204() throws Exception {
    doNothing().when(tripService).deleteTrip(tripId, actorId);

    mockMvc.perform(delete("/api/v1/trips/{tripId}", tripId)).andExpect(status().isNoContent());
  }

  // ==========================================
  // STATUS: REMOVED MEMBER
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName("6.1. Thành viên đã bị REMOVED cố truy cập chuyến đi -> 403 FORBIDDEN")
  void removedMember_getTrip_rejected_with_403() throws Exception {
    doThrow(new AccessDeniedException("Thành viên không còn ở trạng thái ACTIVE"))
        .when(tripService)
        .getTrip(tripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName("6.2. Thành viên đã bị REMOVED cố xem danh sách thành viên -> 403 FORBIDDEN")
  void removedMember_getTripMembers_rejected_with_403() throws Exception {
    doThrow(new AccessDeniedException("Thành viên không còn ở trạng thái ACTIVE"))
        .when(tripAccessService)
        .requireMember(tripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/members", tripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  // ==========================================
  // CROSS-TRIP IDOR & INFORMATION LEAKAGE
  // ==========================================

  @Test
  @WithMockUser
  @DisplayName(
      "7.1. IDOR: Người dùng A truy cập chuyến đi của Người dùng B qua tripId -> 403 FORBIDDEN")
  void crossTripIdor_userA_accessing_userB_trip_rejected_with_403() throws Exception {
    UUID tripBId = UUID.randomUUID();
    doThrow(
            new AccessDeniedException(
                "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripService)
        .getTrip(tripBId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", tripBId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockUser
  @DisplayName(
      "7.2. Tra cứu trip không tồn tại bởi outsider -> 403 FORBIDDEN (không làm lộ sự tồn tại của"
          + " trip)")
  void nonExistentTrip_queriedByOutsider_rejected_with_403() throws Exception {
    UUID nonExistentTripId = UUID.randomUUID();
    doThrow(
            new AccessDeniedException(
                "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripService)
        .getTrip(nonExistentTripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}", nonExistentTripId))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }
}
