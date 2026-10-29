package com.vista.user.api;

import com.vista.auth.api.dto.UserResponse;
import com.vista.common.security.CurrentUserProvider;
import com.vista.trip.api.dto.TripResponse;
import com.vista.trip.application.TripService;
import com.vista.user.api.dto.ChangePasswordRequest;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.application.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Profile", description = "Các API quản lý và cập nhật hồ sơ người dùng")
public class UserController {

  private final UserService userService;
  private final CurrentUserProvider currentUserProvider;
  private final TripService tripService;

  public UserController(UserService userService, CurrentUserProvider currentUserProvider) {
    this(userService, currentUserProvider, null);
  }

  @Autowired
  public UserController(
      UserService userService,
      CurrentUserProvider currentUserProvider,
      @Autowired(required = false) TripService tripService) {
    this.userService = userService;
    this.currentUserProvider = currentUserProvider;
    this.tripService = tripService;
  }

  @GetMapping("/me")
  @Operation(
      summary = "Lấy hồ sơ cá nhân của người dùng hiện tại",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<UserResponse> getProfile() {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    UserResponse response = userService.getProfile(currentUserId);
    return ResponseEntity.ok(response);
  }

  @PatchMapping("/me")
  @Operation(
      summary = "Cập nhật hồ sơ cá nhân của người dùng hiện tại",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<UserResponse> updateProfile(
      @Valid @RequestBody UpdateProfileRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    UserResponse response = userService.updateProfile(currentUserId, request);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/me/password")
  @Operation(
      summary = "Đổi mật khẩu tài khoản người dùng hiện tại",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Map<String, String>> changePassword(
      @Valid @RequestBody ChangePasswordRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    userService.changePassword(currentUserId, request);
    return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu tài khoản thành công"));
  }

  @GetMapping("/me/trips")
  @Operation(
      summary = "Lấy danh sách các chuyến đi của người dùng hiện tại",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<List<TripResponse>> getMyTrips() {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(
        tripService != null ? tripService.getMyTrips(currentUserId) : List.of());
  }

  @DeleteMapping("/me")
  @Operation(
      summary = "Xóa mềm tài khoản người dùng hiện tại (FR-AUTH-05)",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Map<String, String>> deleteAccount() {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    userService.deleteAccount(currentUserId);
    return ResponseEntity.ok(Map.of("message", "Tài khoản đã được xóa mềm thành công"));
  }
}
