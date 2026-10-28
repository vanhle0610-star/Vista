package com.vista.location.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.location.api.dto.LocationShareResponse;
import com.vista.location.api.dto.StartLocationShareRequest;
import com.vista.location.api.dto.UpdateLocationShareRequest;
import com.vista.location.application.LocationShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/location-shares")
@Tag(name = "TV5 Safety & Location", description = "Chia sẻ vị trí nhóm & bảo vệ an toàn (TV5)")
@SecurityRequirement(name = "bearerAuth")
public class LocationShareController {

  private final LocationShareService locationShareService;
  private final CurrentUserProvider currentUserProvider;

  public LocationShareController(
      LocationShareService locationShareService, CurrentUserProvider currentUserProvider) {
    this.locationShareService = locationShareService;
    this.currentUserProvider = currentUserProvider;
  }

  @PutMapping("/me")
  @Operation(
      summary = "Bật chia sẻ vị trí opt-in",
      description = "Thành viên đồng thuận chia sẻ vị trí với thời gian hết hạn cụ thể")
  public ResponseEntity<LocationShareResponse> startShare(
      @PathVariable UUID tripId, @Valid @RequestBody StartLocationShareRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    LocationShareResponse response =
        locationShareService.startShare(tripId, currentUserId, request);
    return ResponseEntity.ok(response);
  }

  @PatchMapping("/me")
  @Operation(
      summary = "Cập nhật tọa độ GPS mới nhất",
      description = "Cập nhật tọa độ của chính mình trong phiên đang hoạt động")
  public ResponseEntity<LocationShareResponse> updateLocation(
      @PathVariable UUID tripId, @Valid @RequestBody UpdateLocationShareRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    LocationShareResponse response =
        locationShareService.updateLocation(tripId, currentUserId, request);
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/me")
  @Operation(
      summary = "Dừng chia sẻ vị trí (Opt-out)",
      description = "Dừng chia sẻ và xóa tọa độ tức thời khỏi hệ thống")
  public ResponseEntity<Void> stopShare(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    locationShareService.stopShare(tripId, currentUserId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping
  @Operation(
      summary = "Lấy danh sách vị trí thành viên đang hoạt động",
      description = "Chỉ trả về các thành viên đã bật chia sẻ, chưa hết hạn và có tọa độ hợp lệ")
  public ResponseEntity<Page<LocationShareResponse>> getActiveShares(
      @PathVariable UUID tripId, @PageableDefault(size = 20) Pageable pageable) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    Page<LocationShareResponse> responses =
        locationShareService.getActiveShares(tripId, currentUserId, pageable);
    return ResponseEntity.ok(responses);
  }
}
