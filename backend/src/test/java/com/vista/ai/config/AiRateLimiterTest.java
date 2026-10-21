package com.vista.ai.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vista.auth.exception.RateLimitExceededException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AiRateLimiterTest {

  private AiRateLimiter rateLimiter;
  private UUID user1;
  private UUID user2;

  @BeforeEach
  void setUp() {
    rateLimiter = new AiRateLimiter(5);
    user1 = UUID.randomUUID();
    user2 = UUID.randomUUID();
  }

  @Test
  @DisplayName("1. Cho phép tối đa 5 lượt gọi AI trong ngày mà không ném ngoại lệ")
  void checkAndConsume_shouldAllowUpTo5Calls() {
    for (int i = 1; i <= 5; i++) {
      int remainingBefore = rateLimiter.getRemainingQuota(user1);
      assertThat(remainingBefore).isEqualTo(6 - i);

      assertThatCode(() -> rateLimiter.checkAndConsume(user1)).doesNotThrowAnyException();
    }

    assertThat(rateLimiter.getRemainingQuota(user1)).isZero();
  }

  @Test
  @DisplayName("2. Chặn và ném RateLimitExceededException ở lượt gọi thứ 6")
  void checkAndConsume_shouldThrow_on6thCall() {
    for (int i = 0; i < 5; i++) {
      rateLimiter.checkAndConsume(user1);
    }

    assertThatThrownBy(() -> rateLimiter.checkAndConsume(user1))
        .isInstanceOf(RateLimitExceededException.class)
        .hasMessageContaining("Bạn đã sử dụng hết 5 lượt gợi ý AI trong ngày hôm nay")
        .satisfies(
            ex -> {
              RateLimitExceededException rateLimitEx = (RateLimitExceededException) ex;
              assertThat(rateLimitEx.getRetryAfterSeconds()).isPositive();
            });
  }

  @Test
  @DisplayName("3. Hạn ngạch giữa các người dùng hoàn toàn độc lập với nhau")
  void checkAndConsume_differentUsers_shouldHaveIndependentQuotas() {
    // User 1 dùng hết 5 lượt
    for (int i = 0; i < 5; i++) {
      rateLimiter.checkAndConsume(user1);
    }

    // User 1 bị chặn
    assertThatThrownBy(() -> rateLimiter.checkAndConsume(user1))
        .isInstanceOf(RateLimitExceededException.class);

    // User 2 vẫn còn nguyên 5 lượt và gọi thành công
    assertThat(rateLimiter.getRemainingQuota(user2)).isEqualTo(5);
    assertThatCode(() -> rateLimiter.checkAndConsume(user2)).doesNotThrowAnyException();
    assertThat(rateLimiter.getRemainingQuota(user2)).isEqualTo(4);
  }

  @Test
  @DisplayName("4. Phương thức reset đặt lại hạn ngạch cho người dùng")
  void reset_shouldRestoreQuota() {
    for (int i = 0; i < 5; i++) {
      rateLimiter.checkAndConsume(user1);
    }
    assertThat(rateLimiter.getRemainingQuota(user1)).isZero();

    rateLimiter.reset(user1);

    assertThat(rateLimiter.getRemainingQuota(user1)).isEqualTo(5);
    assertThatCode(() -> rateLimiter.checkAndConsume(user1)).doesNotThrowAnyException();
  }
}
