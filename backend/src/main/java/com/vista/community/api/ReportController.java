package com.vista.community.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.community.api.dto.CreateReportRequest;
import com.vista.community.api.dto.HandleReportRequest;
import com.vista.community.api.dto.ReportResponse;
import com.vista.community.application.ReportService;
import com.vista.moderation.ContentModerationRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
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

  @Autowired(required = false)
  private ContentModerationRuleService moderationRuleService;

  public ReportController(ReportService reportService, CurrentUserProvider currentUserProvider) {
    this.reportService = reportService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping({"/posts/{postId}/reports", "/community/posts/{postId}/reports"})
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

  @PostMapping("/admin/moderation/evaluate")
  @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
  @Operation(
      summary = "Đánh giá 3 quy tắc kiểm duyệt nội dung tự động (W5-TV1-03)",
      description =
          "Kiểm duyệt URL, nội dung trùng lặp và tần suất đăng bài, lưu moderation_events")
  public ResponseEntity<ContentModerationRuleService.ModerationEvaluationResult> evaluateContent(
      @RequestBody Map<String, String> payload) {
    UUID authorId =
        payload != null && payload.get("authorId") != null
            ? UUID.fromString(payload.get("authorId"))
            : currentUserProvider.getCurrentUserId();
    UUID targetId =
        payload != null && payload.get("targetId") != null
            ? UUID.fromString(payload.get("targetId"))
            : UUID.randomUUID();
    String targetType =
        payload != null && payload.get("targetType") != null ? payload.get("targetType") : "POST";
    String body = payload != null && payload.get("body") != null ? payload.get("body") : "";

    ContentModerationRuleService service =
        moderationRuleService != null
            ? moderationRuleService
            : new ContentModerationRuleService(null);
    return ResponseEntity.ok(service.evaluateAndRecord(authorId, targetType, targetId, body));
  }

  @GetMapping("/admin/moderation/events")
  @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
  @Operation(summary = "Xem danh sách sự kiện kiểm duyệt tự động/thủ công (moderation_events)")
  public ResponseEntity<List<ContentModerationRuleService.ModerationEventRecord>>
      listModerationEvents(@RequestParam(defaultValue = "20") int limit) {
    if (moderationRuleService == null) {
      return ResponseEntity.ok(List.of());
    }
    return ResponseEntity.ok(moderationRuleService.listRecentEvents(limit));
  }
}
