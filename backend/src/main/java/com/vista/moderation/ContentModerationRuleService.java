package com.vista.moderation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dịch vụ kiểm duyệt nội dung cơ bản (W5-TV1-03): 1. Kiểm duyệt URL (URL đáng ngờ / rút gọn / spam
 * nhiều liên kết). 2. Kiểm duyệt nội dung trùng lặp (cùng tác giả đăng nội dung giống hệt trong 24
 * giờ). 3. Kiểm duyệt tần suất đăng bài (vượt ngưỡng giới hạn số bài đăng trong 5 phút). Lưu kết
 * quả vào bảng {@code moderation_events}.
 */
@Service
public class ContentModerationRuleService {

  public static final int MAX_ALLOWED_URLS = 2;
  public static final int MAX_POSTS_PER_5_MINUTES = 5;

  private static final Pattern URL_PATTERN =
      Pattern.compile("(?i)\\b(?:https?://|www\\.)[^\\s<>\"']+");

  private static final Set<String> SUSPICIOUS_URL_DOMAINS =
      Set.of(
          "bit.ly",
          "tinyurl.com",
          "t.me",
          "goo.gl",
          "ow.ly",
          "is.gd",
          "bet88",
          "casino",
          "nhacai",
          "phishing",
          "free-money");

  private final JdbcTemplate db;
  private final ObjectMapper objectMapper;

  @Autowired
  public ContentModerationRuleService(@Autowired(required = false) JdbcTemplate db) {
    this(db, new ObjectMapper());
  }

  public ContentModerationRuleService(JdbcTemplate db, ObjectMapper objectMapper) {
    this.db = db;
    this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
  }

  public record ModerationEvaluationResult(
      UUID eventId,
      String targetType,
      UUID targetId,
      boolean passed,
      String action,
      BigDecimal ruleScore,
      List<String> triggeredRules,
      List<String> reasons,
      String previousStatus,
      String nextStatus,
      Instant evaluatedAt) {}

  public record ModerationEventRecord(
      UUID id,
      String targetType,
      UUID targetId,
      BigDecimal ruleScore,
      String reasonsJson,
      String action,
      UUID reviewerId,
      String previousStatus,
      String nextStatus,
      Instant createdAt) {}

  /**
   * Đánh giá 3 quy tắc kiểm duyệt nội dung cơ bản và ghi nhận vào bảng {@code moderation_events}.
   */
  @Transactional
  public ModerationEvaluationResult evaluateAndRecord(
      UUID authorId, String targetType, UUID targetId, String contentBody) {
    Objects.requireNonNull(authorId, "authorId must not be null");
    String normalizedTargetType =
        (targetType == null || targetType.isBlank())
            ? "POST"
            : targetType.trim().toUpperCase(Locale.ROOT);
    UUID effectiveTargetId = targetId != null ? targetId : UUID.randomUUID();
    String body = contentBody != null ? contentBody.trim() : "";

    List<String> triggeredRules = new ArrayList<>();
    List<String> reasons = new ArrayList<>();
    double score = 0.0;

    // Quy tắc 1: Kiểm duyệt URL (URL_CHECK)
    UrlCheckOutcome urlOutcome = checkUrls(body);
    if (urlOutcome.violated()) {
      triggeredRules.add("URL_CHECK");
      reasons.add(urlOutcome.reason());
      score += urlOutcome.scoreContribution();
    }

    // Quy tắc 2: Kiểm duyệt nội dung trùng lặp (DUPLICATE_CONTENT)
    if (isDuplicateContent(authorId, effectiveTargetId, body)) {
      triggeredRules.add("DUPLICATE_CONTENT");
      reasons.add("Nội dung bài viết trùng lặp với bài đã đăng gần đây của cùng người dùng.");
      score += 0.45;
    }

    // Quy tắc 3: Kiểm duyệt tần suất đăng bài (POST_FREQUENCY)
    if (isRateLimitExceeded(authorId)) {
      triggeredRules.add("POST_FREQUENCY");
      reasons.add(
          "Tần suất đăng bài vượt ngưỡng cho phép (tối đa "
              + MAX_POSTS_PER_5_MINUTES
              + " bài trong 5 phút).");
      score += 0.50;
    }

    BigDecimal finalScore =
        BigDecimal.valueOf(Math.min(1.0, score)).setScale(4, RoundingMode.HALF_UP);
    boolean passed = triggeredRules.isEmpty();
    String action =
        passed
            ? "ALLOW"
            : (finalScore.compareTo(new BigDecimal("0.7500")) >= 0 ? "AUTO_HIDE" : "FLAG_REVIEW");
    String previousStatus = "VISIBLE";
    String nextStatus = "AUTO_HIDE".equals(action) ? "HIDDEN" : "VISIBLE";

    UUID eventId = UUID.randomUUID();
    Instant now = Instant.now();

    persistModerationEvent(
        eventId,
        normalizedTargetType,
        effectiveTargetId,
        finalScore,
        triggeredRules,
        reasons,
        action,
        previousStatus,
        nextStatus);

    return new ModerationEvaluationResult(
        eventId,
        normalizedTargetType,
        effectiveTargetId,
        passed,
        action,
        finalScore,
        List.copyOf(triggeredRules),
        List.copyOf(reasons),
        previousStatus,
        nextStatus,
        now);
  }

  public record UrlCheckOutcome(boolean violated, String reason, double scoreContribution) {}

  public UrlCheckOutcome checkUrls(String contentBody) {
    if (contentBody == null || contentBody.isBlank()) {
      return new UrlCheckOutcome(false, null, 0.0);
    }

    Matcher matcher = URL_PATTERN.matcher(contentBody);
    List<String> urls = new ArrayList<>();
    while (matcher.find()) {
      urls.add(matcher.group().toLowerCase(Locale.ROOT));
    }

    for (String url : urls) {
      for (String domain : SUSPICIOUS_URL_DOMAINS) {
        if (url.contains(domain)) {
          return new UrlCheckOutcome(
              true, "Phát hiện liên kết thuộc tên miền đáng ngờ hoặc rút gọn: " + domain, 0.80);
        }
      }
    }

    if (urls.size() > MAX_ALLOWED_URLS) {
      return new UrlCheckOutcome(
          true,
          "Bài viết chứa quá nhiều liên kết ("
              + urls.size()
              + " URL, tối đa cho phép "
              + MAX_ALLOWED_URLS
              + ").",
          0.55);
    }

    return new UrlCheckOutcome(false, null, 0.0);
  }

  public boolean isDuplicateContent(UUID authorId, UUID currentPostId, String contentBody) {
    if (contentBody == null || contentBody.isBlank() || db == null) {
      return false;
    }
    String normalized = normalizeContent(contentBody);
    try {
      List<String> recentBodies =
          db.queryForList(
              "SELECT body FROM posts "
                  + "WHERE user_id = ? AND id <> ? AND deleted_at IS NULL "
                  + "AND created_at >= now() - interval '24 hours' "
                  + "ORDER BY created_at DESC LIMIT 20",
              String.class,
              authorId,
              currentPostId);
      for (String existing : recentBodies) {
        if (existing != null && normalizeContent(existing).equals(normalized)) {
          return true;
        }
      }
    } catch (Exception ignored) {
      // Fallback safe if database query is unavailable in unit test
    }
    return false;
  }

  public boolean isRateLimitExceeded(UUID authorId) {
    if (authorId == null || db == null) {
      return false;
    }
    try {
      Integer recentPostCount =
          db.queryForObject(
              "SELECT count(*) FROM posts "
                  + "WHERE user_id = ? AND deleted_at IS NULL "
                  + "AND created_at >= now() - interval '5 minutes'",
              Integer.class,
              authorId);
      return recentPostCount != null && recentPostCount >= MAX_POSTS_PER_5_MINUTES;
    } catch (Exception ignored) {
      return false;
    }
  }

  @Transactional(readOnly = true)
  public List<ModerationEventRecord> listRecentEvents(int limit) {
    if (db == null) {
      return List.of();
    }
    int validLimit = Math.max(1, Math.min(limit, 100));
    return db.query(
        "SELECT id, target_type, target_id, rule_score, reasons_json::text AS reasons_json, "
            + "action, reviewer_id, previous_status, next_status, created_at "
            + "FROM moderation_events "
            + "ORDER BY created_at DESC LIMIT ?",
        (rs, rowNum) ->
            new ModerationEventRecord(
                rs.getObject("id", UUID.class),
                rs.getString("target_type"),
                rs.getObject("target_id", UUID.class),
                rs.getBigDecimal("rule_score"),
                rs.getString("reasons_json"),
                rs.getString("action"),
                rs.getObject("reviewer_id", UUID.class),
                rs.getString("previous_status"),
                rs.getString("next_status"),
                rs.getTimestamp("created_at") != null
                    ? rs.getTimestamp("created_at").toInstant()
                    : Instant.now()),
        validLimit);
  }

  private void persistModerationEvent(
      UUID eventId,
      String targetType,
      UUID targetId,
      BigDecimal ruleScore,
      List<String> triggeredRules,
      List<String> reasons,
      String action,
      String previousStatus,
      String nextStatus) {
    if (db == null) {
      return;
    }
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("rules", triggeredRules);
    payload.put("reasons", reasons);
    String reasonsJson = "{}";
    try {
      reasonsJson = objectMapper.writeValueAsString(payload);
    } catch (JsonProcessingException ignored) {
      reasonsJson = "{}";
    }

    db.update(
        "INSERT INTO moderation_events "
            + "(id, target_type, target_id, rule_score, reasons_json, action, previous_status, next_status, created_at) "
            + "VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, now())",
        eventId,
        targetType,
        targetId,
        ruleScore,
        reasonsJson,
        action,
        previousStatus,
        nextStatus);
  }

  static String normalizeContent(String text) {
    if (text == null) {
      return "";
    }
    return text.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
  }
}
