package com.vista.ai.config;

import com.vista.auth.exception.RateLimitExceededException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Bộ kiểm soát tần suất gọi AI (Rate Limiter) theo Quyết định thiết kế D5. Giới hạn tối đa 5 lượt
 * gọi AI gợi ý lịch trình mỗi ngày cho mỗi người dùng (5 calls/day/user).
 */
@Component
public class AiRateLimiter {

  public static final int DEFAULT_DAILY_LIMIT = 5;

  private final int dailyLimit;
  private final Map<String, AtomicInteger> usageMap = new ConcurrentHashMap<>();

  public AiRateLimiter() {
    this(DEFAULT_DAILY_LIMIT);
  }

  public AiRateLimiter(int dailyLimit) {
    if (dailyLimit <= 0) {
      throw new IllegalArgumentException("dailyLimit must be strictly positive");
    }
    this.dailyLimit = dailyLimit;
  }

  /**
   * Kiểm tra và trừ 1 lượt sử dụng AI. Ném ngoại lệ RateLimitExceededException (429) nếu vượt hạn
   * mức.
   */
  public void checkAndConsume(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");

    String key = buildKey(userId, LocalDate.now());
    AtomicInteger counter = usageMap.computeIfAbsent(key, k -> new AtomicInteger(0));

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
