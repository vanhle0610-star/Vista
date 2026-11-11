package com.vista.collaboration.member;

import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller xử lý các endpoint Quản lý thành viên (TV3):
 * - DELETE /trips/{tripId}/members/me (và /api/v1/trips/{tripId}/members/me)
 * - POST /trips/{tripId}/transfer-ownership (và /api/v1/trips/{tripId}/transfer-ownership)
 */
@RestController
@RequestMapping({"/api/v1", ""})
@Tag(name = "Trip Members", description = "Quản lý thành viên chuyến đi: rời nhóm, chuyển quyền trưởng nhóm (TV3)")
@SecurityRequirement(name = "bearerAuth")
public class TripMemberController {

  private final TripMemberService tripMemberService;
  private final CurrentUserProvider currentUserProvider;

  public TripMemberController(
      TripMemberService tripMemberService, CurrentUserProvider currentUserProvider) {
    this.tripMemberService = tripMemberService;
    this.currentUserProvider = currentUserProvider;
  }

  @DeleteMapping("/trips/{tripId}/members/me")
  @Operation(
      summary = "Rời nhóm chuyến đi",
      description =
          "Thành viên rời nhóm (xóa khỏi bảng trip_members). Trưởng nhóm không thể rời khi chưa chuyển quyền hoặc là thành viên duy nhất.")
  public ResponseEntity<Void> leaveTrip(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripMemberService.leaveTrip(tripId, currentUserId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/trips/{tripId}/transfer-ownership")
  @Operation(
      summary = "Chuyển quyền trưởng nhóm",
      description =
          "Trưởng nhóm chuyển quyền cho một thành viên ACTIVE khác trong cùng chuyến đi.")
  public ResponseEntity<TransferOwnershipResponse> transferOwnership(
      @PathVariable UUID tripId, @Valid @RequestBody TransferOwnershipRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    TransferOwnershipResponse response =
        tripMemberService.transferOwnership(tripId, currentUserId, request.newOwnerId());
    return ResponseEntity.ok(response);
  }
}

