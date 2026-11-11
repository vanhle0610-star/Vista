package com.vista.collaboration.member;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.collaboration.exception.ConflictException;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.web.GlobalExceptionHandler;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TripMemberController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class TripMemberControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private TripMemberService tripMemberService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private static final UUID TRIP_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID CURRENT_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");
  private static final UUID TARGET_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000020");

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(CURRENT_USER_ID);
  }

  // ── DELETE /trips/{tripId}/members/me ──────────────────────────────────────

  @Test
  @DisplayName("DELETE /trips/{tripId}/members/me thành công → 204 No Content")
  void leaveTrip_success_returns204() throws Exception {
    doNothing().when(tripMemberService).leaveTrip(TRIP_ID, CURRENT_USER_ID);

    mockMvc
        .perform(delete("/trips/{tripId}/members/me", TRIP_ID))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/members/me", TRIP_ID))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("DELETE /trips/{tripId}/members/me khi OWNER chưa chuyển quyền → 409 Conflict")
  void leaveTrip_ownerHasOtherMembers_returns409() throws Exception {
    doThrow(new ConflictException("Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm"))
        .when(tripMemberService)
        .leaveTrip(TRIP_ID, CURRENT_USER_ID);

    mockMvc
        .perform(delete("/trips/{tripId}/members/me", TRIP_ID))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.detail").value("Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm"));
  }

  @Test
  @DisplayName("DELETE /trips/{tripId}/members/me khi người gọi không phải thành viên → 403 Forbidden")
  void leaveTrip_notMember_returns403() throws Exception {
    doThrow(new AccessDeniedException("Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này"))
        .when(tripMemberService)
        .leaveTrip(TRIP_ID, CURRENT_USER_ID);

    mockMvc
        .perform(delete("/trips/{tripId}/members/me", TRIP_ID))
        .andExpect(status().isForbidden());
  }

  // ── POST /trips/{tripId}/transfer-ownership ────────────────────────────────

  @Test
  @DisplayName("POST /trips/{tripId}/transfer-ownership hợp lệ → 200 OK")
  void transferOwnership_success_returns200() throws Exception {
    TransferOwnershipRequest request = new TransferOwnershipRequest(TARGET_USER_ID);
    TransferOwnershipResponse response =
        new TransferOwnershipResponse(TRIP_ID, CURRENT_USER_ID, TARGET_USER_ID, "Chuyển quyền thành công");

    when(tripMemberService.transferOwnership(TRIP_ID, CURRENT_USER_ID, TARGET_USER_ID))
        .thenReturn(response);

    mockMvc
        .perform(
            post("/trips/{tripId}/transfer-ownership", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tripId").value(TRIP_ID.toString()))
        .andExpect(jsonPath("$.previousOwnerId").value(CURRENT_USER_ID.toString()))
        .andExpect(jsonPath("$.newOwnerId").value(TARGET_USER_ID.toString()));
  }

  @Test
  @DisplayName("POST /trips/{tripId}/transfer-ownership người gọi không phải OWNER → 403 Forbidden")
  void transferOwnership_notOwner_returns403() throws Exception {
    TransferOwnershipRequest request = new TransferOwnershipRequest(TARGET_USER_ID);

    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(tripMemberService)
        .transferOwnership(TRIP_ID, CURRENT_USER_ID, TARGET_USER_ID);

    mockMvc
        .perform(
            post("/trips/{tripId}/transfer-ownership", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("POST /trips/{tripId}/transfer-ownership người nhận không thuộc nhóm → 400 Bad Request")
  void transferOwnership_targetNotMember_returns400() throws Exception {
    TransferOwnershipRequest request = new TransferOwnershipRequest(TARGET_USER_ID);

    doThrow(new IllegalArgumentException("Người được chuyển quyền phải là thành viên của chuyến đi"))
        .when(tripMemberService)
        .transferOwnership(TRIP_ID, CURRENT_USER_ID, TARGET_USER_ID);

    mockMvc
        .perform(
            post("/trips/{tripId}/transfer-ownership", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("Người được chuyển quyền phải là thành viên của chuyến đi"));
  }
}

