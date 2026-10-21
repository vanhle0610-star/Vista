package com.vista.collaboration;

import static org.mockito.ArgumentMatchers.any;
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
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.invitation.CreateInvitationRequest;
import com.vista.collaboration.invitation.InvitationController;
import com.vista.collaboration.invitation.InvitationResponse;
import com.vista.collaboration.invitation.InvitationService;
import com.vista.collaboration.invitation.InvitationStatus;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.web.GlobalExceptionHandler;
import java.time.Instant;
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

@WebMvcTest(InvitationController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class InvitationControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private InvitationService invitationService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final ObjectMapper objectMapper = new ObjectMapper();

  static final UUID TRIP_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  static final UUID MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");
  static final UUID NON_MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000999");
  static final UUID INVITATION_ID = UUID.fromString("00000000-0000-0000-0000-000000000100");
  static final String RAW_TOKEN = "abc123rawtoken";

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(MEMBER_ID);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private InvitationResponse pendingResponse() {
    return new InvitationResponse(
        INVITATION_ID, TRIP_ID, MEMBER_ID, "user@vista.vn",
        InvitationStatus.PENDING, Instant.now().plusSeconds(86400),
        Instant.now(), null, null);
  }

  private InvitationResponse pendingWithToken() {
    return new InvitationResponse(
        INVITATION_ID, TRIP_ID, MEMBER_ID, "user@vista.vn",
        InvitationStatus.PENDING, Instant.now().plusSeconds(86400),
        Instant.now(), RAW_TOKEN, "http://localhost:3000/invite/" + RAW_TOKEN);
  }

  // ── W3-TV3-01: Tạo lời mời ────────────────────────────────────────────────

  @Test
  @DisplayName("W3-01 POST /trips/{id}/invitations - Người ngoài trip bị 403")
  void createInvitation_nonMember_returns403() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);
    when(invitationService.createInvitation(eq(TRIP_ID), eq(NON_MEMBER_ID), any()))
        .thenThrow(new AccessDeniedException("Bạn không có quyền truy cập chuyến đi này"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateInvitationRequest("x@x.com"))))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("W3-01 POST /trips/{id}/invitations - Trùng email PENDING → 409")
  void createInvitation_duplicatePending_returns409() throws Exception {
    when(invitationService.createInvitation(eq(TRIP_ID), eq(MEMBER_ID), any()))
        .thenThrow(new ConflictException("Lời mời cho email 'x@x.com' đang ở trạng thái PENDING"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateInvitationRequest("x@x.com"))))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("W3-01 POST /trips/{id}/invitations - Tạo thành công → 201 + rawToken + inviteLink")
  void createInvitation_valid_returns201WithToken() throws Exception {
    when(invitationService.createInvitation(eq(TRIP_ID), eq(MEMBER_ID), any()))
        .thenReturn(pendingWithToken());

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateInvitationRequest("user@vista.vn"))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(INVITATION_ID.toString()))
        .andExpect(jsonPath("$.status").value("PENDING"))
        .andExpect(jsonPath("$.rawToken").value(RAW_TOKEN))
        .andExpect(jsonPath("$.inviteLink").exists());
  }

  @Test
  @DisplayName("W3-01 DELETE /invitations/{id} - Không phải Owner → 403")
  void revokeInvitation_nonOwner_returns403() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);
    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(invitationService)
        .revokeInvitation(INVITATION_ID, NON_MEMBER_ID);

    mockMvc
        .perform(delete("/api/v1/invitations/{id}", INVITATION_ID))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("W3-01 DELETE /invitations/{id} - Owner thu hồi thành công → 204")
  void revokeInvitation_owner_returns204() throws Exception {
    doNothing().when(invitationService).revokeInvitation(INVITATION_ID, MEMBER_ID);

    mockMvc
        .perform(delete("/api/v1/invitations/{id}", INVITATION_ID))
        .andExpect(status().isNoContent());
  }

  // ── W3-TV3-02: Accept / Decline ───────────────────────────────────────────

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/accept - Token hết hạn → 409")
  void acceptInvitation_expiredToken_returns409() throws Exception {
    when(invitationService.acceptInvitation(eq(RAW_TOKEN), any()))
        .thenThrow(new ConflictException("Lời mời tham gia chuyến đi đã hết hạn"));

    mockMvc
        .perform(post("/api/v1/invitations/{token}/accept", RAW_TOKEN))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/accept - Lời mời đã REVOKED → 409")
  void acceptInvitation_revokedToken_returns409() throws Exception {
    when(invitationService.acceptInvitation(eq(RAW_TOKEN), any()))
        .thenThrow(
            new ConflictException("Lời mời không ở trạng thái PENDING (hiện tại: REVOKED)"));

    mockMvc
        .perform(post("/api/v1/invitations/{token}/accept", RAW_TOKEN))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/accept - Token đã ACCEPTED → 409")
  void acceptInvitation_alreadyAccepted_returns409() throws Exception {
    when(invitationService.acceptInvitation(eq(RAW_TOKEN), any()))
        .thenThrow(
            new ConflictException("Lời mời không ở trạng thái PENDING (hiện tại: ACCEPTED)"));

    mockMvc
        .perform(post("/api/v1/invitations/{token}/accept", RAW_TOKEN))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/accept - Token không tồn tại → 404")
  void acceptInvitation_unknownToken_returns404() throws Exception {
    when(invitationService.acceptInvitation(eq("unknowntoken"), any()))
        .thenThrow(new ResourceNotFoundException("Token lời mời không tồn tại"));

    mockMvc
        .perform(post("/api/v1/invitations/{token}/accept", "unknowntoken"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/accept - Hợp lệ → 200 ACCEPTED")
  void acceptInvitation_valid_returns200() throws Exception {
    InvitationResponse accepted =
        new InvitationResponse(
            INVITATION_ID, TRIP_ID, MEMBER_ID, "user@vista.vn",
            InvitationStatus.ACCEPTED, Instant.now().plusSeconds(86400),
            Instant.now(), null, null);

    when(invitationService.acceptInvitation(eq(RAW_TOKEN), eq(MEMBER_ID))).thenReturn(accepted);

    mockMvc
        .perform(post("/api/v1/invitations/{token}/accept", RAW_TOKEN))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ACCEPTED"));
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/decline - Lời mời không PENDING → 409")
  void declineInvitation_notPending_returns409() throws Exception {
    when(invitationService.declineInvitation(eq(RAW_TOKEN), any()))
        .thenThrow(
            new ConflictException("Lời mời không ở trạng thái PENDING (hiện tại: ACCEPTED)"));

    mockMvc
        .perform(post("/api/v1/invitations/{token}/decline", RAW_TOKEN))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("W3-02 POST /invitations/{token}/decline - Hợp lệ → 200 DECLINED")
  void declineInvitation_valid_returns200() throws Exception {
    InvitationResponse declined =
        new InvitationResponse(
            INVITATION_ID, TRIP_ID, MEMBER_ID, "user@vista.vn",
            InvitationStatus.DECLINED, Instant.now().plusSeconds(86400),
            Instant.now(), null, null);

    when(invitationService.declineInvitation(eq(RAW_TOKEN), eq(MEMBER_ID))).thenReturn(declined);

    mockMvc
        .perform(post("/api/v1/invitations/{token}/decline", RAW_TOKEN))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DECLINED"));
  }
}
