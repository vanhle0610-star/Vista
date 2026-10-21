package com.vista.collaboration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.collaboration.exception.ConflictException;
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

  private static final UUID TRIP_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");
  private static final UUID NON_MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000999");
  private static final UUID INVITATION_ID = UUID.fromString("00000000-0000-0000-0000-000000000100");

  @BeforeEach
  void setUp() {
    // Mặc định: currentUser là MEMBER
    when(currentUserProvider.getCurrentUserId()).thenReturn(MEMBER_ID);
  }

  @Test
  @DisplayName("POST /api/v1/trips/{tripId}/invitations - Người ngoài chuyến đi bị 403")
  void createInvitation_whenNonMember_returns403Forbidden() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);
    CreateInvitationRequest request = new CreateInvitationRequest("friend@vista.vn");

    when(invitationService.createInvitation(
            eq(TRIP_ID), eq(NON_MEMBER_ID), any(CreateInvitationRequest.class)))
        .thenThrow(new AccessDeniedException("Bạn không có quyền truy cập chuyến đi này"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("POST /api/v1/trips/{tripId}/invitations - Trùng email PENDING bị 409")
  void createInvitation_whenDuplicatePendingEmail_returns409Conflict() throws Exception {
    String duplicateEmail = "pending@vista.vn";
    CreateInvitationRequest request = new CreateInvitationRequest(duplicateEmail);

    when(invitationService.createInvitation(
            eq(TRIP_ID), eq(MEMBER_ID), any(CreateInvitationRequest.class)))
        .thenThrow(new ConflictException(
            "Lời mời cho email '" + duplicateEmail + "' đang ở trạng thái PENDING"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("POST /api/v1/trips/{tripId}/invitations - Thành viên tạo lời mời hợp lệ → 201")
  void createInvitation_whenValidMember_returns201Created() throws Exception {
    CreateInvitationRequest request = new CreateInvitationRequest("newuser@vista.vn");

    InvitationResponse response = new InvitationResponse(
        INVITATION_ID,
        TRIP_ID,
        MEMBER_ID,
        "newuser@vista.vn",
        InvitationStatus.PENDING,
        Instant.now().plusSeconds(86400),
        Instant.now());

    when(invitationService.createInvitation(
            eq(TRIP_ID), eq(MEMBER_ID), any(CreateInvitationRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/invitations", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(INVITATION_ID.toString()))
        .andExpect(jsonPath("$.inviteeEmail").value("newuser@vista.vn"))
        .andExpect(jsonPath("$.status").value("PENDING"));
  }

  @Test
  @DisplayName("DELETE /api/v1/invitations/{id} - Không phải Owner thu hồi lời mời bị 403")
  void revokeInvitation_whenNonOwner_returns403Forbidden() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);

    doThrow(new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này"))
        .when(invitationService)
        .revokeInvitation(INVITATION_ID, NON_MEMBER_ID);

    mockMvc
        .perform(delete("/api/v1/invitations/{id}", INVITATION_ID))
        .andExpect(status().isForbidden());
  }
}
