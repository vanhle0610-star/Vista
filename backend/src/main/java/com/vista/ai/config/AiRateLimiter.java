package com.vista.ai.config;

import com.vista.auth.exception.RateLimitExceededException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Bộ kiểm soát tần suất gọi AI (Rate Limiter) bảo vệ chi phí và chống spam. Hỗ trợ lưu trữ bền vững
 * trên PostgreSQL (ai_rate_limits) và phân tán qua nhiều instance.
 */
@Component
public class AiRateLimiter {

  private static final Logger log = LoggerFactory.getLogger(AiRateLimiter.class);

  public static final int DEFAULT_DAILY_LIMIT = 5;
  public static final int PUBLIC_MINUTE_LIMIT = 5;
  public static final int PUBLIC_HOUR_LIMIT = 20;
  public static final int PUBLIC_DAILY_LIMIT = 50;
  public static final int SYSTEM_WIDE_DAILY_QUOTA = 1000;

  private final int dailyLimit;
  private final JdbcTemplate jdbcTemplate;
  private final Map<String, AtomicInteger> usageMap = new ConcurrentHashMap<>();

  public AiRateLimiter() {
    this(DEFAULT_DAILY_LIMIT, null);
  }

  public AiRateLimiter(int dailyLimit) {
    this(dailyLimit, null);
  }

  @Autowired(required = false)
  public AiRateLimiter(JdbcTemplate jdbcTemplate) {
    this(DEFAULT_DAILY_LIMIT, jdbcTemplate);
  }

  public AiRateLimiter(int dailyLimit, JdbcTemplate jdbcTemplate) {
    if (dailyLimit <= 0) {
      throw new IllegalArgumentException("dailyLimit must be strictly positive");
    }
    this.dailyLimit = dailyLimit;
    this.jdbcTemplate = jdbcTemplate;
  }

  /** Kiểm tra và trừ 1 lượt sử dụng AI cho người dùng đã xác thực (5 lượt/ngày/user). */
  public void checkAndConsume(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");

    String key = "USER:" + userId;
    Instant dayStart = Instant.now().truncatedTo(ChronoUnit.DAYS);

    if (jdbcTemplate != null) {
      try {
        int count = incrementAndGetDb(key, dayStart, "DAY");
        if (count > dailyLimit) {
          long secondsUntilMidnight = calculateSecondsUntilMidnight();
          throw new RateLimitExceededException(
              "Bạn đã sử dụng hết "
                  + dailyLimit
                  + " lượt gợi ý AI trong ngày hôm nay. Vui lòng quay lại vào ngày mai.",
              secondsUntilMidnight);
        }
        return;
      } catch (RateLimitExceededException e) {
        throw e;
      } catch (Exception e) {
        log.warn("Database rate limit query failed, falling back to memory: {}", e.getMessage());
      }
    }

    // In-memory fallback
    String memKey = buildKey(userId, LocalDate.now());
    AtomicInteger counter = usageMap.computeIfAbsent(memKey, k -> new AtomicInteger(0));
    int currentCount = counter.incrementAndGet();
    if (currentCount > dailyLimit) {
      long secondsUntilMidnight = calculateSecondsUntilMidnight();
      throw new RateLimitExceededException(
          "Bạn đã sử dụng hết "
              + dailyLimit
              + " lượt gợi ý AI trong ngày hôm nay. Vui lòng quay lại vào ngày mai.",
          secondsUntilMidnight);
    }
  }

  /**
   * Rate limit cho public endpoint Quick Plan dựa trên IP + Device Identifier. Kiểm tra hạn mức
   * phút (5/phút), giờ (20/giờ), ngày (50/ngày) và hạn ngạch toàn hệ thống.
   */
  public void checkPublicRateLimit(String clientIdentifier) {
    String cleanClient =
        (clientIdentifier != null && !clientIdentifier.isBlank())
            ? clientIdentifier.trim()
            : "unknown_client";

    Instant now = Instant.now();
    Instant minuteStart = now.truncatedTo(ChronoUnit.MINUTES);
    Instant hourStart = now.truncatedTo(ChronoUnit.HOURS);
    Instant dayStart = now.truncatedTo(ChronoUnit.DAYS);

    // 1. Kiểm tra hạn ngạch chi phí toàn hệ thống (System-wide daily cost protection)
    checkLimit(
        "GLOBAL_QUOTA",
        dayStart,
        "DAY",
        SYSTEM_WIDE_DAILY_QUOTA,
        3600,
        "Hệ thống trợ lý AI hiện đang đạt giới hạn công suất hôm nay. Vui lòng thử lại sau.");

    // 2. Kiểm tra hạn mức từng client theo phút, giờ, ngày
    checkLimit(
        "PUB_MIN:" + cleanClient,
        minuteStart,
        "MINUTE",
        PUBLIC_MINUTE_LIMIT,
        60,
        "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ 1 phút.");
    checkLimit(
        "PUB_HOUR:" + cleanClient,
        hourStart,
        "HOUR",
        PUBLIC_HOUR_LIMIT,
        3600,
        "Bạn đã vượt quá giới hạn 20 yêu cầu lập lịch trình mỗi giờ. Vui lòng quay lại sau.");
    checkLimit(
        "PUB_DAY:" + cleanClient,
        dayStart,
        "DAY",
        PUBLIC_DAILY_LIMIT,
        calculateSecondsUntilMidnight(),
        "Bạn đã sử dụng hết 50 lượt tạo lịch trình công khai trong ngày.");
  }

  private void checkLimit(
      String key,
      Instant windowStart,
      String windowType,
      int maxAllowed,
      long retryAfterSeconds,
      String message) {
    if (jdbcTemplate != null) {
      try {
        int count = incrementAndGetDb(key, windowStart, windowType);
        if (count > maxAllowed) {
          throw new RateLimitExceededException(message, retryAfterSeconds);
        }
        return;
      } catch (RateLimitExceededException e) {
        throw e;
      } catch (Exception e) {
        log.warn("Database rate limit query error for {}: {}", key, e.getMessage());
      }
    }

    // In-memory fallback
    String memKey = key + ":" + windowStart.getEpochSecond();
    AtomicInteger counter = usageMap.computeIfAbsent(memKey, k -> new AtomicInteger(0));
    int count = counter.incrementAndGet();
    if (count > maxAllowed) {
      throw new RateLimitExceededException(message, retryAfterSeconds);
    }
  }

  private int incrementAndGetDb(String limitKey, Instant windowStart, String windowType) {
    String sql =
        "INSERT INTO ai_rate_limits (id, limit_key, window_start, window_type, request_count, created_at, updated_at) "
            + "VALUES (gen_random_uuid(), ?, ?, ?, 1, now(), now()) "
            + "ON CONFLICT (limit_key, window_start, window_type) "
            + "DO UPDATE SET request_count = ai_rate_limits.request_count + 1, updated_at = now() "
            + "RETURNING request_count";

    Integer result =
        jdbcTemplate.queryForObject(sql, Integer.class, limitKey, windowStart, windowType);
    return result != null ? result : 1;
  }

  /** Lấy số lượt còn lại trong ngày của người dùng. */
  public int getRemainingQuota(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    String key = buildKey(userId, LocalDate.now());
    AtomicInteger counter = usageMap.get(key);
    int used = counter != null ? counter.get() : 0;
    return Math.max(0, dailyLimit - used);
  }

  /** Đặt lại bộ đếm của người dùng (hỗ trợ kiểm thử tự động). */
  public void reset(UUID userId) {
    if (userId != null) {
      String key = buildKey(userId, LocalDate.now());
      usageMap.remove(key);
    }
  }

  private String buildKey(UUID userId, LocalDate date) {
    return userId.toString() + ":" + date.toString();
  }

  private long calculateSecondsUntilMidnight() {
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime midnight = now.toLocalDate().atTime(LocalTime.MAX);
    long diff = Duration.between(now, midnight).getSeconds();
    return Math.max(1, diff);
  }
}
