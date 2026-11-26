package com.vista.destination.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import com.vista.destination.api.dto.DestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestPageDto;
import com.vista.destination.api.dto.SubmitDestinationRequestDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationRequestConflictException;
import com.vista.destination.service.DestinationRequestForbiddenException;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/destination-requests")
@Tag(
    name = "Destination Requests",
    description = "Người dùng đề xuất thêm địa điểm còn thiếu hoặc yêu cầu cập nhật địa điểm")
@SecurityRequirement(name = "bearerAuth")
public class DestinationRequestController {

  private final DestinationRequestService requestService;
  private final CurrentUserProvider currentUserProvider;

  public DestinationRequestController(
      DestinationRequestService requestService, CurrentUserProvider currentUserProvider) {
    this.requestService = requestService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  @Operation(summary = "Gửi yêu cầu thêm mới hoặc cập nhật địa điểm")
  public ResponseEntity<DestinationRequestDto> submitRequest(
      @Valid @RequestBody SubmitDestinationRequestDto request,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    UUID userId = resolveUserId(userPrincipal);
    DestinationRequestDto created = requestService.submitRequest(userId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Chỉnh sửa hoặc gửi lại yêu cầu của bản thân")
  public ResponseEntity<DestinationRequestDto> updateMyRequest(
      @PathVariable UUID id,
      @Valid @RequestBody SubmitDestinationRequestDto request,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    UUID userId = resolveUserId(userPrincipal);
    return ResponseEntity.ok(requestService.updateMyRequest(userId, id, request));
  }

  @GetMapping("/me")
  @Operation(summary = "Danh sách yêu cầu do người dùng hiện tại đã gửi")
  public ResponseEntity<DestinationRequestPageDto> getMyRequests(
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    UUID userId = resolveUserId(userPrincipal);
    return ResponseEntity.ok(requestService.getMyRequests(userId, status, page, size));
  }

  private UUID resolveUserId(UserPrincipal userPrincipal) {
    if (userPrincipal != null && userPrincipal.getId() != null) {
      return userPrincipal.getId();
    }
    return currentUserProvider.getCurrentUserId();
  }

  @ExceptionHandler({
    DestinationRequestNotFoundException.class,
    DestinationNotFoundException.class
  })
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

  @ExceptionHandler(DestinationRequestForbiddenException.class)
  public ProblemDetail handleForbidden(
      DestinationRequestForbiddenException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/forbidden"));
    problem.setTitle("Forbidden");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "FORBIDDEN");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
