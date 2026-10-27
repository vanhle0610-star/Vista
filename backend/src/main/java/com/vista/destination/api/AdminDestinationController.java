package com.vista.destination.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationStatusUpdateRequest;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/destinations")
@Tag(
    name = "Admin Destinations",
    description = "Kiểm duyệt và phê duyệt điểm đến du lịch (FR-ADM-01, FR-ADM-03)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
public class AdminDestinationController {

  private final DestinationService destinationService;
  private final CurrentUserProvider currentUserProvider;

  public AdminDestinationController(
      DestinationService destinationService, CurrentUserProvider currentUserProvider) {
    this.destinationService = destinationService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(
      summary = "Lấy hàng đợi kiểm duyệt điểm đến (FR-ADM-03)",
      description =
          "Hỗ trợ lọc theo trạng thái (DRAFT, PUBLISHED, REJECTED, ALL), từ khóa, tỉnh thành, phân trang")
  public ResponseEntity<DestinationPageDto> getModerationQueue(
      @Parameter(description = "Từ khóa tìm kiếm (tên, mô tả)") @RequestParam(required = false)
          String keyword,
      @Parameter(description = "Tên tỉnh thành") @RequestParam(required = false) String province,
      @Parameter(description = "Danh mục điểm đến") @RequestParam(required = false) String category,
      @Parameter(
              description =
                  "Trạng thái kiểm duyệt: DRAFT, PUBLISHED, REJECTED, hoặc ALL (mặc định DRAFT)")
          @RequestParam(defaultValue = "DRAFT")
          String status,
      @Parameter(description = "Số trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0")
          int page,
      @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = "20")
          int size) {

    DestinationPageDto result =
        destinationService.searchModerationQueue(keyword, province, category, status, page, size);
    return ResponseEntity.ok(result);
  }

  @GetMapping("/stats")
  @Operation(
      summary = "Thống kê số lượng điểm đến theo trạng thái",
      description =
          "Trả về tổng số, số lượng DRAFT, PUBLISHED, REJECTED để hiển thị badge dashboard")
  public ResponseEntity<Map<String, Long>> getModerationStats() {
    return ResponseEntity.ok(destinationService.getModerationStats());
  }

  @GetMapping("/{id}")
  @Operation(
      summary = "Xem chi tiết điểm đến cho quản trị viên/kiểm duyệt viên",
      description = "Xem toàn bộ nội dung của điểm đến ở bất kỳ trạng thái nào để thẩm định")
  public ResponseEntity<DestinationDetailDto> getDestinationAdminDetail(@PathVariable UUID id) {
    DestinationDetailDto detail = destinationService.getDestinationAdminDetail(id);
    return ResponseEntity.ok(detail);
  }

  @PutMapping("/{id}/approve")
  @Operation(
      summary = "Phê duyệt xuất bản điểm đến (Approve)",
      description = "Chuyển trạng thái điểm đến sang PUBLISHED và ghi nhận thời điểm verifiedAt")
  public ResponseEntity<DestinationDetailDto> approveDestination(
      @PathVariable UUID id,
      @RequestBody(required = false) Map<String, String> body,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {

    UUID moderatorId = resolveModeratorId(userPrincipal);
    String note = body != null ? body.get("note") : "Phê duyệt công bố điểm đến du lịch";
    DestinationDetailDto updated = destinationService.approveDestination(id, moderatorId, note);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/reject")
  @Operation(
      summary = "Từ chối điểm đến (Reject)",
      description = "Chuyển trạng thái điểm đến sang REJECTED và lưu lý do từ chối")
  public ResponseEntity<DestinationDetailDto> rejectDestination(
      @PathVariable UUID id,
      @RequestBody(required = false) Map<String, String> body,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {

    UUID moderatorId = resolveModeratorId(userPrincipal);
    String note = body != null ? body.get("note") : "Từ chối kiểm duyệt điểm đến";
    DestinationDetailDto updated = destinationService.rejectDestination(id, moderatorId, note);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/status")
  @Operation(
      summary = "Cập nhật trạng thái điểm đến linh hoạt (DRAFT, PUBLISHED, REJECTED)",
      description = "Cho phép cập nhật hoặc hoàn tác trạng thái kiểm duyệt")
  public ResponseEntity<DestinationDetailDto> updateDestinationStatus(
      @PathVariable UUID id,
      @Valid @RequestBody DestinationStatusUpdateRequest request,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {

    UUID moderatorId = resolveModeratorId(userPrincipal);
    DestinationDetailDto updated =
        destinationService.updateDestinationStatus(
            id, request.status(), moderatorId, request.note());
    return ResponseEntity.ok(updated);
  }

  private UUID resolveModeratorId(UserPrincipal userPrincipal) {
    if (userPrincipal != null && userPrincipal.getId() != null) {
      return userPrincipal.getId();
    }
    return currentUserProvider.getCurrentUserId();
  }

  @ExceptionHandler(DestinationNotFoundException.class)
  public ProblemDetail handleDestinationNotFound(
      DestinationNotFoundException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/not-found"));
    problem.setTitle("Destination Not Found");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DESTINATION_NOT_FOUND");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ProblemDetail handleIllegalArgument(
      IllegalArgumentException ex, HttpServletRequest request) {
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/bad-request"));
    problem.setTitle("Invalid Argument");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "INVALID_ARGUMENT");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
