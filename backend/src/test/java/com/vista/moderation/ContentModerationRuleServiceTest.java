package com.vista.moderation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("W5-TV1-03: ContentModerationRuleService Unit Tests (3 Rules + moderation_events)")
class ContentModerationRuleServiceTest {

  private JdbcTemplate jdbcTemplate;
  private ContentModerationRuleService service;

  private final UUID authorId = UUID.randomUUID();
  private final UUID postId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    jdbcTemplate = mock(JdbcTemplate.class);
    service = new ContentModerationRuleService(jdbcTemplate, new ObjectMapper());
  }

  @Test
  @DisplayName("Rule 1 (URL_CHECK): Detects suspicious/shortened URLs and records moderation_event")
  void evaluateAndRecord_suspiciousUrl_triggersUrlRule() {
    when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(authorId), eq(postId)))
        .thenReturn(List.of());
    when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(authorId))).thenReturn(0);

    var result =
        service.evaluateAndRecord(
            authorId,
            "POST",
            postId,
            "Nhận thưởng du lịch miễn phí ngay tại https://bit.ly/free-money-trip!");

    assertThat(result.passed()).isFalse();
    assertThat(result.triggeredRules()).contains("URL_CHECK");
    assertThat(result.action()).isEqualTo("AUTO_HIDE");
    assertThat(result.nextStatus()).isEqualTo("HIDDEN");
    assertThat(result.ruleScore()).isGreaterThanOrEqualTo(new BigDecimal("0.7500"));

    verify(jdbcTemplate)
        .update(
            anyString(),
            eq(result.eventId()),
            eq("POST"),
            eq(postId),
            eq(result.ruleScore()),
            anyString(),
            eq("AUTO_HIDE"),
            eq("VISIBLE"),
            eq("HIDDEN"));
  }

  @Test
  @DisplayName("Rule 1 (URL_CHECK): Detects excessive URLs (> 2 links) and flags for review")
  void evaluateAndRecord_excessiveUrls_triggersUrlRule() {
    when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(authorId), eq(postId)))
        .thenReturn(List.of());
    when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(authorId))).thenReturn(1);

    var result =
        service.evaluateAndRecord(
            authorId,
            "POST",
            postId,
            "Xem thêm https://example.com/a và https://example.com/b cùng https://example.com/c");

    assertThat(result.passed()).isFalse();
    assertThat(result.triggeredRules()).containsExactly("URL_CHECK");
    assertThat(result.action()).isEqualTo("FLAG_REVIEW");
    assertThat(result.reasons().getFirst()).contains("quá nhiều liên kết");
  }

  @Test
  @DisplayName(
      "Rule 2 (DUPLICATE_CONTENT): Detects duplicate post body by same user within 24 hours")
  void evaluateAndRecord_duplicateContent_triggersDuplicateRule() {
    when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(authorId), eq(postId)))
        .thenReturn(List.of("Trải nghiệm ngắm hoàng hôn tuyệt đẹp tại Cầu Vàng Đà Nẵng!"));
    when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(authorId))).thenReturn(1);

    var result =
        service.evaluateAndRecord(
            authorId,
            "POST",
            postId,
            "  Trải nghiệm ngắm hoàng hôn   tuyệt đẹp tại Cầu Vàng Đà Nẵng! ");

    assertThat(result.passed()).isFalse();
    assertThat(result.triggeredRules()).containsExactly("DUPLICATE_CONTENT");
    assertThat(result.action()).isEqualTo("FLAG_REVIEW");
    assertThat(result.reasons().getFirst()).contains("trùng lặp");
  }

  @Test
  @DisplayName("Rule 3 (POST_FREQUENCY): Detects excessive posting frequency (>= 5 posts / 5 min)")
  void evaluateAndRecord_rateLimitExceeded_triggersFrequencyRule() {
    when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(authorId), eq(postId)))
        .thenReturn(List.of());
    when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(authorId))).thenReturn(5);

    var result =
        service.evaluateAndRecord(
            authorId, "POST", postId, "Chia sẻ kinh nghiệm du lịch Hội An tự túc.");

    assertThat(result.passed()).isFalse();
    assertThat(result.triggeredRules()).containsExactly("POST_FREQUENCY");
    assertThat(result.action()).isEqualTo("FLAG_REVIEW");
    assertThat(result.reasons().getFirst()).contains("Tần suất đăng bài vượt ngưỡng");
  }

  @Test
  @DisplayName("Clean content passes all 3 rules with ALLOW action and records moderation_event")
  void evaluateAndRecord_cleanContent_allowsAndPersistsEvent() {
    when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(authorId), eq(postId)))
        .thenReturn(List.of("Bài viết khác hoàn toàn về ẩm thực Huế"));
    when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(authorId))).thenReturn(1);

    var result =
        service.evaluateAndRecord(
            authorId,
            "POST",
            postId,
            "Cầu Rồng phun lửa vào tối thứ 7 và Chủ nhật hàng tuần lúc 21:00.");

    assertThat(result.passed()).isTrue();
    assertThat(result.triggeredRules()).isEmpty();
    assertThat(result.action()).isEqualTo("ALLOW");
    assertThat(result.ruleScore()).isEqualByComparingTo("0.0000");

    verify(jdbcTemplate)
        .update(
            anyString(),
            eq(result.eventId()),
            eq("POST"),
            eq(postId),
            eq(new BigDecimal("0.0000")),
            anyString(),
            eq("ALLOW"),
            eq("VISIBLE"),
            eq("VISIBLE"));
  }
}
