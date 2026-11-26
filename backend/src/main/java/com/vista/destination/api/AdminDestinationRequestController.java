package com.vista.destination.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import com.vista.destination.api.dto.ApproveDestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestPageDto;
import com.vista.destination.api.dto.DestinationRequestStatsDto;
import com.vista.destination.api.dto.RejectDestinationRequestDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationRequestConflictException;
import com.vista.destination.service.DestinationRequestNotFoundException;
import com.vista.destination.service.DestinationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/admin/destination-requests")
@Tag(
    name = "Admin Destination Requests",
    description = "Kiểm duyệt yêu cầu thêm mới / cập nhật địa điểm từ người dùng")
@SecurityRequirement(name = "bearerAuth")
public class AdminDestinationRequestController {

  private final DestinationRequestService requestService;
  private final CurrentUserProvider currentUserProvider;

  public AdminDestinationRequestController(
      DestinationRequestService requestService, CurrentUserProvider currentUserProvider) {
    this.requestService = requestService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Danh sách yêu cầu từ người dùng cho Admin/Moderator")
  public ResponseEntity<DestinationRequestPageDto> listRequests(
      @RequestParam(defaultValue = "PENDING") String status,
      @RequestParam(required = false) String requestType,
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(
        requestService.getAdminRequests(status, requestType, keyword, page, size));
  }

  @GetMapping("/stats")
  @Operation(summary = "Thống kê số lượng yêu cầu theo trạng thái")
  public ResponseEntity<DestinationRequestStatsDto> getStats() {
    return ResponseEntity.ok(requestService.getStats());
  }

  @GetMapping("/{id}")
  @Operation(summary = "Chi tiết yêu cầu kèm dữ liệu địa điểm hiện tại (nếu UPDATE)")
  public ResponseEntity<DestinationRequestDto> getDetail(@PathVariable UUID id) {
    return ResponseEntity.ok(requestService.getAdminRequestDetail(id));
  }

  @PutMapping("/{id}/approve")
  @Operation(summary = "Phê duyệt yêu cầu và áp dụng vào bảng destinations")
  public ResponseEntity<DestinationRequestDto> approve(
      @PathVariable UUID id,
      @RequestBody(required = false) ApproveDestinationRequestDto overrides,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    UUID moderatorId = resolveModeratorId(userPrincipal);
    return ResponseEntity.ok(requestService.approveRequest(id, moderatorId, overrides));
  }

  @PutMapping("/{id}/reject")
  @Operation(summary = "Từ chối yêu cầu kèm lý do bắt buộc (10-500 ký tự)")
  public ResponseEntity<DestinationRequestDto> reject(
      @PathVariable UUID id,
      @Valid @RequestBody RejectDestinationRequestDto body,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    UUID moderatorId = resolveModeratorId(userPrincipal);
    return ResponseEntity.ok(requestService.rejectRequest(id, moderatorId, body.reason()));
  }

  private UUID resolveModeratorId(UserPrincipal userPrincipal) {
    if (userPrincipal != null && userPrincipal.getId() != null) {
      return userPrincipal.getId();
    }
    try {
      return currentUserProvider.getCurrentUserId();
    } catch (Exception e) {
      return UUID.fromString("00000000-0000-0000-0000-000000000001");
    }
  }

  @ExceptionHandler({DestinationRequestNotFoundException.class, DestinationNotFoundException.class})
  public ProblemDetail handleNotFound(RuntimeException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/not-found"));
    problem.setTitle("Not Found");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DESTINATION_REQUEST_NOT_FOUND");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(DestinationRequestConflictException.class)
  public ProblemDetail handleConflict(
      DestinationRequestConflictException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/conflict"));
    problem.setTitle("Conflict");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DESTINATION_REQUEST_CONFLICT");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
