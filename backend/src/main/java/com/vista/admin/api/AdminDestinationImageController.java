package com.vista.admin.api;

import com.vista.admin.application.AdminDestinationImageService;
import com.vista.admin.dto.AiImagePageDto;
import com.vista.admin.dto.AiImageStatsDto;
import com.vista.admin.dto.DestinationImageAuditItemDto;
import com.vista.admin.dto.ImageUpdateHistoryDto;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import com.vista.destination.service.DestinationNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
@RequestMapping("/api/v1/admin/destination-images")
@Tag(
    name = "Admin AI Image Manager",
    description = "Hệ thống AI tự động rà soát, tìm kiếm, đề xuất và cập nhật hình ảnh địa điểm")
@SecurityRequirement(name = "bearerAuth")
public class AdminDestinationImageController {

  private static final Logger log = LoggerFactory.getLogger(AdminDestinationImageController.class);

  private final AdminDestinationImageService imageService;
  private final CurrentUserProvider currentUserProvider;

  public AdminDestinationImageController(
      AdminDestinationImageService imageService, CurrentUserProvider currentUserProvider) {
    this.imageService = imageService;
    this.currentUserProvider = currentUserProvider;
  }

  public record ScanRequest(List<UUID> destinationIds, Boolean verifyHttp) {}

  public record SearchBatchRequest(List<UUID> destinationIds) {}

  public record SelectCandidateRequest(
      String candidateUrl,
      String sourceName,
      String sourcePageUrl,
      String license,
      Integer confidence,
      Boolean approvedReady) {}

  public record ApplyImageRequest(
      String imageUrl,
      String sourceName,
      String sourcePageUrl,
      String license,
      Integer confidence) {}

  public record ApplyBatchRequest(List<UUID> destinationIds) {}

  @GetMapping
  @Operation(
      summary = "Lấy danh sách kiểm tra hình ảnh địa điểm kèm thống kê",
      description =
          "Hỗ trợ lọc theo trạng thái kiểm tra ảnh, tỉnh thành, danh mục, từ khóa và phân trang")
  public ResponseEntity<AiImagePageDto> getImageAuditPage(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String province,
      @RequestParam(required = false) String category,
      @RequestParam(defaultValue = "ALL") String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) Integer limit) {
    int effectiveSize = (limit != null && limit > 0) ? limit : size;
    log.info(
        "[AI-Image-Manager] GET /api/v1/admin/destination-images status={}, province={}, category={}, keyword={}, page={}, size={}",
        status,
        province,
        category,
        keyword,
        page,
        effectiveSize);
    AiImagePageDto result =
        imageService.getPageAndStats(keyword, province, category, status, page, effectiveSize);
    return ResponseEntity.ok(result);
  }

  @GetMapping("/stats")
  @Operation(summary = "Lấy thống kê tổng quan AI Image Manager")
  public ResponseEntity<AiImageStatsDto> getStats() {
    log.info("[AI-Image-Manager] GET /api/v1/admin/destination-images/stats");
    return ResponseEntity.ok(imageService.getStats());
  }

  @GetMapping("/target-ids")
  @Operation(
      summary = "Lấy danh sách ID các địa điểm theo nhóm trạng thái để xử lý theo lô (Batch)",
      description = "mode = ALL | NEEDS_ATTENTION | PENDING_APPROVAL | APPROVED_READY")
  public ResponseEntity<List<UUID>> getTargetIds(
      @RequestParam(defaultValue = "NEEDS_ATTENTION") String mode,
      @RequestParam(required = false) String province,
      @RequestParam(required = false) String keyword) {
    log.info(
        "[AI-Image-Manager] GET /api/v1/admin/destination-images/target-ids mode={}, province={}, keyword={}",
        mode,
        province,
        keyword);
    return ResponseEntity.ok(imageService.getTargetIds(mode, province, keyword));
  }

  @PostMapping("/scan")
  @Operation(summary = "Quét và kiểm tra trạng thái ảnh cho danh sách địa điểm")
  public ResponseEntity<List<DestinationImageAuditItemDto>> scanDestinations(
      @RequestBody(required = false) ScanRequest request) {
    List<UUID> ids = request != null ? request.destinationIds() : null;
    boolean verifyHttp = request != null && Boolean.TRUE.equals(request.verifyHttp());
    List<DestinationImageAuditItemDto> scanned = imageService.scanDestinations(ids, verifyHttp);
    return ResponseEntity.ok(scanned);
  }

  @PostMapping("/{id}/search")
  @Operation(summary = "Tìm kiếm tối đa 3 ảnh đề xuất chính xác cho 1 địa điểm")
  public ResponseEntity<DestinationImageAuditItemDto> searchForDestination(
      @PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
    String customQuery = body != null ? body.get("query") : null;
    DestinationImageAuditItemDto result =
        imageService.searchCandidatesForDestination(id, customQuery);
    return ResponseEntity.ok(result);
  }

  @PostMapping("/search-batch")
  @Operation(summary = "Tìm kiếm ảnh đề xuất theo lô (Batch)")
  public ResponseEntity<List<DestinationImageAuditItemDto>> searchBatch(
      @RequestBody SearchBatchRequest request) {
    List<DestinationImageAuditItemDto> results =
        imageService.searchCandidatesBatch(request != null ? request.destinationIds() : List.of());
    return ResponseEntity.ok(results);
  }

  @PutMapping("/{id}/select")
  @Operation(summary = "Chọn ảnh đề xuất hoặc đánh dấu duyệt chờ cập nhật")
  public ResponseEntity<DestinationImageAuditItemDto> selectOrApproveCandidate(
      @PathVariable UUID id, @RequestBody SelectCandidateRequest request) {
    boolean approved = request.approvedReady() == null || request.approvedReady();
    DestinationImageAuditItemDto updated =
        imageService.selectOrApproveCandidate(
            id,
            request.candidateUrl(),
            request.sourceName(),
            request.sourcePageUrl(),
            request.license(),
            request.confidence(),
            approved);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/apply")
  @Operation(summary = "Duyệt và cập nhật ngay ảnh mới cho địa điểm (có lưu lịch sử rollback)")
  public ResponseEntity<DestinationImageAuditItemDto> applyImageUpdate(
      @PathVariable UUID id,
      @RequestBody(required = false) ApplyImageRequest request,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    String actorName = resolveActorName(principal);
    DestinationImageAuditItemDto updated =
        imageService.applyImageUpdate(
            id,
            request != null ? request.imageUrl() : null,
            request != null ? request.sourceName() : null,
            request != null ? request.sourcePageUrl() : null,
            request != null ? request.license() : null,
            request != null ? request.confidence() : null,
            actorId,
            actorName);
    return ResponseEntity.ok(updated);
  }

  @PostMapping("/apply-batch")
  @Operation(summary = "Cập nhật hàng loạt các địa điểm đã được duyệt ảnh")
  public ResponseEntity<List<DestinationImageAuditItemDto>> applyBatch(
      @RequestBody(required = false) ApplyBatchRequest request,
      @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    String actorName = resolveActorName(principal);
    List<DestinationImageAuditItemDto> updated =
        imageService.applyBatchApproved(
            request != null ? request.destinationIds() : null, actorId, actorName);
    return ResponseEntity.ok(updated);
  }

  @PutMapping("/{id}/rollback")
  @Operation(summary = "Khôi phục (Rollback) ảnh cũ trước khi cập nhật cho địa điểm")
  public ResponseEntity<DestinationImageAuditItemDto> rollbackImage(
      @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
    UUID actorId = resolveActorId(principal);
    String actorName = resolveActorName(principal);
    DestinationImageAuditItemDto restored = imageService.rollbackImage(id, actorId, actorName);
    return ResponseEntity.ok(restored);
  }

  @PutMapping("/{id}/skip")
  @Operation(summary = "Bỏ qua địa điểm khỏi hàng đợi xử lý ảnh")
  public ResponseEntity<DestinationImageAuditItemDto> skipDestination(@PathVariable UUID id) {
    return ResponseEntity.ok(imageService.skipDestination(id));
  }

  @GetMapping("/history")
  @Operation(summary = "Xem nhật ký cập nhật và khôi phục ảnh địa điểm")
  public ResponseEntity<List<ImageUpdateHistoryDto>> getUpdateHistory(
      @RequestParam(defaultValue = "50") int limit) {
    return ResponseEntity.ok(imageService.getUpdateHistory(limit));
  }

  private UUID resolveActorId(UserPrincipal principal) {
    if (principal != null && principal.getId() != null) {
      return principal.getId();
    }
    try {
      return currentUserProvider.getCurrentUserId();
    } catch (Exception e) {
      return UUID.fromString("00000000-0000-0000-0000-000000000001");
    }
  }

  private String resolveActorName(UserPrincipal principal) {
    if (principal != null && principal.getEmail() != null && !principal.getEmail().isBlank()) {
      return principal.getEmail();
    }
    return "Admin VISTA";
  }

  @ExceptionHandler(DestinationNotFoundException.class)
  public ProblemDetail handleNotFound(DestinationNotFoundException ex, HttpServletRequest request) {
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
    log.warn(
        "[AI-Image-Manager] IllegalArgumentException on {}: {}",
        request.getRequestURI(),
        ex.getMessage());
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/bad-request"));
    problem.setTitle("Invalid Operation");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "INVALID_OPERATION");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }

  @ExceptionHandler(Exception.class)
  public ProblemDetail handleUnexpectedException(Exception ex, HttpServletRequest request)
      throws Exception {
    if (ex instanceof AccessDeniedException) {
      throw ex;
    }
    log.error(
        "[AI-Image-Manager] Unhandled exception on {}?{}: {}",
        request.getRequestURI(),
        request.getQueryString(),
        ex.getMessage(),
        ex);
    String detailMsg =
        ex.getMessage() != null && !ex.getMessage().isBlank()
            ? "Lỗi xử lý AI Image Manager: " + ex.getMessage()
            : "Đã xảy ra lỗi máy chủ khi xử lý dữ liệu AI Image Manager";
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, detailMsg);
    problem.setType(URI.create("https://vista.example/errors/internal"));
    problem.setTitle("AI Image Manager Error");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "AI_IMAGE_MANAGER_ERROR");
    problem.setProperty("exceptionType", ex.getClass().getSimpleName());
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
