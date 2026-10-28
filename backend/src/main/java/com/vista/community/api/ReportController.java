package com.vista.community.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.community.api.dto.CreateReportRequest;
import com.vista.community.api.dto.HandleReportRequest;
import com.vista.community.api.dto.ReportResponse;
import com.vista.community.application.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(
    name = "Moderation & Reports",
    description = "API Báo cáo vi phạm và Kiểm duyệt nội dung bài viết cộng đồng")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

  private final ReportService reportService;
  private final CurrentUserProvider currentUserProvider;

  public ReportController(ReportService reportService, CurrentUserProvider currentUserProvider) {
    this.reportService = reportService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping("/posts/{postId}/reports")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Người dùng báo cáo bài viết vi phạm")
  public ResponseEntity<Map<String, Object>> reportPost(
      @PathVariable UUID postId, @Valid @RequestBody CreateReportRequest request) {
    UUID reporterId = currentUserProvider.getCurrentUserId();
    UUID reportId = reportService.createReport(reporterId, postId, request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            Map.of(
                "reportId", reportId,
                "status", "OPEN",
                "message", "Báo cáo của bạn đã được ghi nhận và gửi tới ban kiểm duyệt."));
  }

  @GetMapping("/admin/reports")
  @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
  @Operation(summary = "Moderator/Admin xem hàng đợi báo cáo vi phạm")
  public ResponseEntity<List<ReportResponse>> listReports(
      @RequestParam(required = false, defaultValue = "OPEN") String status,
      @RequestParam(required = false, defaultValue = "0") int page,
      @RequestParam(required = false, defaultValue = "20") int size) {
    List<ReportResponse> reports = reportService.listReports(status, page, size);
    return ResponseEntity.ok(reports);
  }

  @PatchMapping("/admin/reports/{reportId}")
  @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
  @Operation(summary = "Moderator/Admin xử lý báo cáo: Ẩn bài viết hoặc Bác bỏ báo cáo")
  public ResponseEntity<ReportResponse> handleReport(
      @PathVariable UUID reportId, @Valid @RequestBody HandleReportRequest request) {
    UUID moderatorId = currentUserProvider.getCurrentUserId();
    ReportResponse updated = reportService.handleReport(moderatorId, reportId, request);
    return ResponseEntity.ok(updated);
  }

  @PostMapping("/admin/posts/{postId}/restore")
  @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
  @Operation(summary = "Moderator/Admin khôi phục bài viết đã bị ẩn")
  public ResponseEntity<Map<String, Object>> restorePost(@PathVariable UUID postId) {
    UUID moderatorId = currentUserProvider.getCurrentUserId();
    reportService.restorePost(moderatorId, postId);
    return ResponseEntity.ok(
        Map.of(
            "postId", postId,
            "status", "VISIBLE",
            "message", "Bài viết đã được khôi phục trở lại công khai."));
  }
}
