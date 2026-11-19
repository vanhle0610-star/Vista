package com.vista.admin.api;

import com.vista.admin.application.AdminUserService;
import com.vista.admin.dto.AdminUserDetailDto;
import com.vista.admin.dto.AdminUserPageDto;
import com.vista.admin.dto.AdminUserStatsDto;
import com.vista.admin.dto.UpdateUserRolesRequest;
import com.vista.admin.dto.UpdateUserStatusRequest;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(
    name = "Admin User Management",
    description = "Quản lý tài khoản người dùng, phân quyền và trạng thái hoạt động (Chỉ ADMIN)")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

  private final AdminUserService adminUserService;
  private final CurrentUserProvider currentUserProvider;

  public AdminUserController(
      AdminUserService adminUserService, CurrentUserProvider currentUserProvider) {
    this.adminUserService = adminUserService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping("/stats")
  @Operation(
      summary = "Thống kê tổng quan người dùng cho Admin Dashboard",
      description =
          "Trả về tổng số người dùng, đang hoạt động, bị khóa, đăng ký mới trong 30 ngày và phân bổ vai trò")
  public ResponseEntity<AdminUserStatsDto> getUserStats() {
    return ResponseEntity.ok(adminUserService.getUserStats());
  }

  @GetMapping
  @Operation(
      summary = "Danh sách người dùng có tìm kiếm, lọc và phân trang",
      description =
          "Tìm kiếm theo tên/email/SĐT, lọc theo vai trò (USER, MODERATOR, ADMIN) và trạng thái (ACTIVE, LOCKED), sắp xếp theo ngày đăng ký")
  public ResponseEntity<AdminUserPageDto> listUsers(
      @Parameter(description = "Từ khóa tìm kiếm theo tên hoặc email")
          @RequestParam(required = false)
          String keyword,
      @Parameter(description = "Từ khóa tìm kiếm (alias q)") @RequestParam(required = false)
          String q,
      @Parameter(description = "Vai trò: ALL, USER, MODERATOR, ADMIN")
          @RequestParam(defaultValue = "ALL")
          String role,
      @Parameter(description = "Trạng thái: ALL, ACTIVE, LOCKED")
          @RequestParam(defaultValue = "ALL")
          String status,
      @Parameter(description = "Thứ tự sắp xếp ngày đăng ký: desc (mới nhất) hoặc asc (cũ nhất)")
          @RequestParam(defaultValue = "desc")
          String sortDir,
      @Parameter(description = "Số trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0")
          int page,
      @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = "10")
          int size) {

    String effectiveKeyword = (keyword != null && !keyword.isBlank()) ? keyword : q;
    AdminUserPageDto result =
        adminUserService.searchUsers(effectiveKeyword, role, status, sortDir, page, size);
    return ResponseEntity.ok(result);
  }

  @GetMapping("/{id}")
  @Operation(
      summary = "Xem chi tiết tài khoản người dùng",
      description =
          "Trả về thông tin hồ sơ chi tiết của người dùng (không bao gồm mật khẩu hay dữ liệu nhạy cảm)")
  public ResponseEntity<AdminUserDetailDto> getUserDetail(@PathVariable UUID id) {
    return ResponseEntity.ok(adminUserService.getUserDetail(id));
  }

  @PutMapping("/{id}/status")
  @PatchMapping("/{id}/status")
  @Operation(
      summary = "Cập nhật trạng thái tài khoản (ACTIVE / LOCKED)",
      description =
          "Khóa hoặc mở khóa tài khoản người dùng. Không cho phép ADMIN tự khóa tài khoản của chính mình.")
  public ResponseEntity<AdminUserDetailDto> updateUserStatus(
      @PathVariable UUID id,
      @Valid @RequestBody UpdateUserStatusRequest request,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    AdminUserDetailDto updated =
        adminUserService.updateUserStatus(id, request.status(), request.reason(), actorId);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/lock")
  @PostMapping("/{id}/lock")
  @Operation(
      summary = "Khóa tài khoản người dùng",
      description = "Chuyển trạng thái sang LOCKED và thu hồi toàn bộ phiên đăng nhập hiện tại")
  public ResponseEntity<AdminUserDetailDto> lockUser(
      @PathVariable UUID id,
      @RequestBody(required = false) Map<String, String> body,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    String reason = body != null ? body.get("reason") : null;
    AdminUserDetailDto updated = adminUserService.updateUserStatus(id, "LOCKED", reason, actorId);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/unlock")
  @PostMapping("/{id}/unlock")
  @Operation(
      summary = "Mở khóa tài khoản người dùng",
      description = "Khôi phục trạng thái ACTIVE cho tài khoản bị khóa")
  public ResponseEntity<AdminUserDetailDto> unlockUser(
      @PathVariable UUID id,
      @RequestBody(required = false) Map<String, String> body,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    String reason = body != null ? body.get("reason") : null;
    AdminUserDetailDto updated = adminUserService.updateUserStatus(id, "ACTIVE", reason, actorId);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/roles")
  @PatchMapping("/{id}/roles")
  @Operation(
      summary = "Thay đổi vai trò của người dùng (USER, MODERATOR, ADMIN)",
      description =
          "Cập nhật danh sách vai trò của tài khoản. Không cho phép ADMIN tự hạ quyền ADMIN của chính mình.")
  public ResponseEntity<AdminUserDetailDto> updateUserRoles(
      @PathVariable UUID id,
      @Valid @RequestBody UpdateUserRolesRequest request,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    List<String> requestedRoles =
        (request.roles() != null && !request.roles().isEmpty())
            ? request.roles()
            : (request.role() != null && !request.role().isBlank()
                ? List.of(request.role())
                : List.of());
    AdminUserDetailDto updated =
        adminUserService.updateUserRoles(id, requestedRoles, request.reason(), actorId);
    return ResponseEntity.ok(updated);
  }

  private UUID resolveActorId(UserPrincipal principal) {
    if (principal != null && principal.getId() != null) {
      return principal.getId();
    }
    try {
      return currentUserProvider.getCurrentUserId();
    } catch (Exception e) {
      return null;
    }
  }
}
