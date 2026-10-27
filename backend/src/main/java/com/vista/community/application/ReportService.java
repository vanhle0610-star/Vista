package com.vista.community.application;

import static com.vista.community.application.CommunityProblem.of;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.vista.common.audit.AuditLogService;
import com.vista.community.api.dto.CreateReportRequest;
import com.vista.community.api.dto.HandleReportRequest;
import com.vista.community.api.dto.ReportResponse;
import com.vista.user.application.UserService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

  private final JdbcTemplate db;
  private final PostVisibilityService postVisibility;
  private final AuditLogService auditLogService;
  private final UserService users;

  public ReportService(
      JdbcTemplate db,
      PostVisibilityService postVisibility,
      AuditLogService auditLogService,
      UserService users) {
    this.db = db;
    this.postVisibility = postVisibility;
    this.auditLogService = auditLogService;
    this.users = users;
  }

  private String userName(UUID userId) {
    if (userId == null) return "Ẩn danh";
    try {
      var profile = users.getProfile(userId);
      return profile != null && profile.displayName() != null
          ? profile.displayName()
          : "Thành viên VISTA";
    } catch (Exception e) {
      return "Thành viên VISTA";
    }
  }

  @Transactional
  public UUID createReport(UUID reporterId, UUID postId, CreateReportRequest request) {
    Objects.requireNonNull(reporterId, "reporterId must not be null");
    Objects.requireNonNull(postId, "postId must not be null");

    // 1. Kiểm tra bài viết có tồn tại và chưa bị tác giả xóa không
    var postRows = db.queryForList("SELECT id, status, deleted_at FROM posts WHERE id = ?", postId);
    if (postRows.isEmpty() || postRows.getFirst().get("deleted_at") != null) {
      throw of(
          NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài viết cần báo cáo hoặc bài đã bị xóa.");
    }

    // 2. Kiểm tra chống spam báo cáo lặp từ cùng một người dùng
    Integer activeCount =
        db.queryForObject(
            "SELECT count(*) FROM content_reports WHERE reporter_id = ? AND target_id = ? AND status = 'OPEN'",
            Integer.class,
            reporterId,
            postId);
    if (activeCount != null && activeCount > 0) {
      throw of(
          CONFLICT,
          "REPORT_ALREADY_SUBMITTED",
          "Bạn đã gửi báo cáo vi phạm cho bài viết này và hệ thống đang xử lý.");
    }

    // 3. Lưu bản ghi báo cáo
    UUID reportId = UUID.randomUUID();
    String reason =
        (request.reason() == null || request.reason().isBlank())
            ? "Nội dung vi phạm quy chuẩn cộng đồng"
            : request.reason().trim();

    try {
      db.update(
          "INSERT INTO content_reports (id, reporter_id, target_type, target_id, reason, status, created_at) "
              + "VALUES (?, ?, 'POST', ?, ?, 'OPEN', now())",
          reportId,
          reporterId,
          postId,
          reason);
    } catch (org.springframework.dao.DataIntegrityViolationException ex) {
      throw of(
          CONFLICT,
          "REPORT_ALREADY_SUBMITTED",
          "Bạn đã gửi báo cáo vi phạm cho bài viết này và hệ thống đang xử lý.");
    }

    return reportId;
  }

  private static final java.util.Set<String> ALLOWED_STATUSES = java.util.Set.of("OPEN", "RESOLVED", "DISMISSED");

  @Transactional(readOnly = true)
  public List<ReportResponse> listReports(String statusFilter, int page, int size) {
    String status =
        (statusFilter == null || statusFilter.isBlank())
            ? "OPEN"
            : statusFilter.trim().toUpperCase();

    if (!ALLOWED_STATUSES.contains(status)) {
      throw of(
          BAD_REQUEST,
          "INVALID_STATUS_FILTER",
          "Trạng thái lọc báo cáo không hợp lệ. Chỉ chấp nhận OPEN, RESOLVED, DISMISSED.");
    }

    int limit = Math.max(1, Math.min(size, 50));
    int offset = Math.max(0, page) * limit;

    return db.query(
        "SELECT cr.*, p.body AS post_body, p.user_id AS post_author_id, p.version AS post_version "
            + "FROM content_reports cr "
            + "LEFT JOIN posts p ON cr.target_id = p.id "
            + "WHERE cr.status = ? "
            + "ORDER BY cr.created_at DESC "
            + "LIMIT ? OFFSET ?",
        this::mapReportRow,
        status,
        limit,
        offset);
  }

  @Transactional
  public ReportResponse handleReport(UUID moderatorId, UUID reportId, HandleReportRequest request) {
    Objects.requireNonNull(moderatorId, "moderatorId must not be null");
    Objects.requireNonNull(reportId, "reportId must not be null");

    var reportList =
        db.queryForList("SELECT * FROM content_reports WHERE id = ? FOR UPDATE", reportId);
    if (reportList.isEmpty()) {
      throw of(NOT_FOUND, "REPORT_NOT_FOUND", "Không tìm thấy báo cáo kiểm duyệt.");
    }

    var reportRow = reportList.getFirst();
    String currentStatus = (String) reportRow.get("status");
    if (!"OPEN".equalsIgnoreCase(currentStatus)) {
      throw of(CONFLICT, "REPORT_ALREADY_HANDLED", "Báo cáo này đã được xử lý trước đó.");
    }

    UUID targetPostId = (UUID) reportRow.get("target_id");
    String action = request.normalizedAction();

    if ("HIDE".equals(action)) {
      // Lấy phiên bản mới nhất của bài viết
      var postRows =
          db.queryForList(
              "SELECT version, status FROM posts WHERE id = ? FOR UPDATE", targetPostId);
      if (postRows.isEmpty()) {
        throw of(NOT_FOUND, "POST_NOT_FOUND", "Bài viết gốc không còn tồn tại.");
      }
      long currentVersion = ((Number) postRows.getFirst().get("version")).longValue();

      // Gọi PostVisibilityService để ẩn bài viết
      postVisibility.hide(targetPostId, moderatorId, currentVersion);

      // Cập nhật trạng thái báo cáo sang RESOLVED
      db.update(
          "UPDATE content_reports SET status = 'RESOLVED', handled_by = ?, handled_at = now() WHERE id = ?",
          moderatorId,
          reportId);

      // Ghi sự kiện moderation_events & audit_logs
      db.update(
          "INSERT INTO moderation_events (target_type, target_id, action, reviewer_id, previous_status, next_status, created_at) "
              + "VALUES ('POST', ?, 'HIDE', ?, 'VISIBLE', 'HIDDEN', now())",
          targetPostId,
          moderatorId);

      auditLogService.logAction(
          moderatorId,
          "MODERATE_HIDE_POST",
          "POST",
          targetPostId.toString(),
          request.note() != null ? request.note() : "Ẩn bài viết theo báo cáo vi phạm");

    } else if ("DISMISS".equals(action)) {
      // Bác bỏ báo cáo, giữ nguyên trạng thái bài viết
      db.update(
          "UPDATE content_reports SET status = 'DISMISSED', handled_by = ?, handled_at = now() WHERE id = ?",
          moderatorId,
          reportId);

      auditLogService.logAction(
          moderatorId,
          "MODERATE_DISMISS_REPORT",
          "REPORT",
          reportId.toString(),
          request.note() != null ? request.note() : "Bác bỏ báo cáo vi phạm (nội dung hợp lệ)");
    } else {
      throw of(
          BAD_REQUEST,
          "INVALID_ACTION",
          "Hành động không hợp lệ. Chỉ chấp nhận HIDE hoặc DISMISS.");
    }

    return getReportById(reportId);
  }

  @Transactional
  public void restorePost(UUID moderatorId, UUID postId) {
    Objects.requireNonNull(moderatorId);
    Objects.requireNonNull(postId);

    var postRows =
        db.queryForList("SELECT version, status FROM posts WHERE id = ? FOR UPDATE", postId);
    if (postRows.isEmpty()) {
      throw of(NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy bài viết để khôi phục.");
    }
    long currentVersion = ((Number) postRows.getFirst().get("version")).longValue();

    postVisibility.restore(postId, moderatorId, currentVersion);

    db.update(
        "INSERT INTO moderation_events (target_type, target_id, action, reviewer_id, previous_status, next_status, created_at) "
            + "VALUES ('POST', ?, 'RESTORE', ?, 'HIDDEN', 'VISIBLE', now())",
        postId,
        moderatorId);

    auditLogService.logAction(
        moderatorId,
        "MODERATE_RESTORE_POST",
        "POST",
        postId.toString(),
        "Khôi phục bài viết bị ẩn trở lại công khai");
  }

  @Transactional(readOnly = true)
  public ReportResponse getReportById(UUID reportId) {
    var list =
        db.query(
            "SELECT cr.*, p.body AS post_body, p.user_id AS post_author_id, p.version AS post_version "
                + "FROM content_reports cr "
                + "LEFT JOIN posts p ON cr.target_id = p.id "
                + "WHERE cr.id = ?",
            this::mapReportRow,
            reportId);
    if (list.isEmpty()) {
      throw of(NOT_FOUND, "REPORT_NOT_FOUND", "Không tìm thấy báo cáo kiểm duyệt.");
    }
    return list.getFirst();
  }

  private ReportResponse mapReportRow(ResultSet rs, int rowNum) throws SQLException {
    UUID id = rs.getObject("id", UUID.class);
    UUID reporterId = rs.getObject("reporter_id", UUID.class);
    UUID targetId = rs.getObject("target_id", UUID.class);
    UUID postAuthorId = rs.getObject("post_author_id", UUID.class);
    UUID handledBy = rs.getObject("handled_by", UUID.class);

    List<String> mediaUrls = List.of();
    if (targetId != null) {
      mediaUrls =
          db.query(
              "SELECT id FROM post_media WHERE post_id = ? ORDER BY id",
              (r, i) -> "/post-media/" + r.getObject("id", UUID.class),
              targetId);
    }

    return new ReportResponse(
        id,
        reporterId,
        userName(reporterId),
        rs.getString("target_type"),
        targetId,
        rs.getString("post_body"),
        mediaUrls,
        userName(postAuthorId),
        rs.getLong("post_version"),
        rs.getString("reason"),
        rs.getString("status"),
        handledBy,
        rs.getTimestamp("handled_at") != null ? rs.getTimestamp("handled_at").toInstant() : null,
        rs.getTimestamp("created_at").toInstant());
  }
}
