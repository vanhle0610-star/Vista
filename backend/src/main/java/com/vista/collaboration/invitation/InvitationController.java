package com.vista.collaboration.invitation;

import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
      InvitationService invitationService, CurrentUserProvider currentUserProvider) {
    this.invitationService = invitationService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping("/trips/{tripId}/invitations")
  @Operation(
      summary = "Tạo lời mời — chỉ member/owner mới tạo được",
      description = "rawToken và inviteLink chỉ xuất hiện trong response này, không lưu vào DB.")
  public ResponseEntity<InvitationResponse> createInvitation(
      @PathVariable UUID tripId, @Valid @RequestBody CreateInvitationRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(invitationService.createInvitation(tripId, userId, request));
  }

  @GetMapping("/trips/{tripId}/invitations")
  @Operation(summary = "Danh sách lời mời của chuyến đi — chỉ member mới xem được")
  public ResponseEntity<List<InvitationResponse>> listInvitations(@PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(invitationService.listInvitations(tripId, userId));
  }

  @DeleteMapping("/invitations/{id}")
  @Operation(summary = "Thu hồi lời mời PENDING — chỉ Owner mới được phép")
  public ResponseEntity<Void> revokeInvitation(@PathVariable UUID id) {
    UUID userId = currentUserProvider.getCurrentUserId();
    invitationService.revokeInvitation(id, userId);
    return ResponseEntity.noContent().build();
  }

  /**
   * W4-TV3-03: Xem trước lời mời theo raw token — deep link / nhập mã. Không yêu cầu đăng nhập
   * (public endpoint): người nhận link bấm vào sẽ thấy thông tin chuyến đi trước khi quyết định
   * chấp nhận/từ chối.
   */
  @GetMapping("/invitations/{token}/preview")
  @Operation(
      summary = "Xem trước lời mời theo token — không yêu cầu đăng nhập",
      description =
          "Dùng cho deep link (vista://invite/{token}) hoặc nhập mã thủ công."
              + " Trả về thông tin chuyến đi + trạng thái lời mời.")
  public ResponseEntity<InvitationPreviewResponse> previewInvitation(@PathVariable String token) {
    return ResponseEntity.ok(invitationService.previewInvitation(token));
  }

  @PostMapping("/invitations/{token}/accept")
  @Operation(summary = "Chấp nhận lời mời — người được mời chấp nhận qua raw token")
  public ResponseEntity<InvitationResponse> acceptInvitation(@PathVariable String token) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(invitationService.acceptInvitation(token, userId));
  }

  @PostMapping("/invitations/{token}/decline")
  @Operation(summary = "Từ chối lời mời — người được mời từ chối qua raw token")
  public ResponseEntity<InvitationResponse> declineInvitation(@PathVariable String token) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(invitationService.declineInvitation(token, userId));
  }
}
