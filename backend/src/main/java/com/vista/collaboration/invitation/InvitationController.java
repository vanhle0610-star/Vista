package com.vista.collaboration.invitation;

import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Invitations", description = "Quản lý lời mời tham gia chuyến đi qua link token")
@SecurityRequirement(name = "bearerAuth")
public class InvitationController {

  private final InvitationService invitationService;
  private final CurrentUserProvider currentUserProvider;

  public InvitationController(
      InvitationService invitationService,
      CurrentUserProvider currentUserProvider) {
    this.invitationService = invitationService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping("/trips/{tripId}/invitations")
  @Operation(summary = "Tạo lời mời — chỉ member của trip mới tạo được (403 nếu không phải)")
  public ResponseEntity<InvitationResponse> createInvitation(
      @PathVariable UUID tripId,
      @Valid @RequestBody CreateInvitationRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    InvitationResponse response = invitationService.createInvitation(tripId, userId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @DeleteMapping("/invitations/{id}")
  @Operation(summary = "Thu hồi lời mời — chỉ Owner của trip mới thu hồi được (403 nếu không phải)")
  public ResponseEntity<Void> revokeInvitation(@PathVariable UUID id) {
    UUID userId = currentUserProvider.getCurrentUserId();
    invitationService.revokeInvitation(id, userId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/invitations/{token}/accept")
  @Operation(summary = "Chấp nhận lời mời qua raw token trong link")
  public ResponseEntity<InvitationResponse> acceptInvitation(@PathVariable String token) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(invitationService.acceptInvitation(token, userId));
  }

  @PostMapping("/invitations/{token}/decline")
  @Operation(summary = "Từ chối lời mời qua raw token trong link")
  public ResponseEntity<InvitationResponse> declineInvitation(@PathVariable String token) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(invitationService.declineInvitation(token, userId));
  }
}
