package com.vista.auth.application;

import com.vista.auth.exception.RateLimitExceededException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class LoginRateLimiter {

  public static final int MAX_FAILED_ATTEMPTS = 5;
  public static final long LOCKOUT_DURATION_SECONDS = 15 * 60L; // 15 minutes

  private static class AttemptRecord {
    int attempts;
    Instant firstAttemptAt;
    Instant lockedUntil;

    AttemptRecord(Instant now) {
      this.attempts = 1;
      this.firstAttemptAt = now;
      this.lockedUntil = null;
    }
  }

  // Key format: "email:<email>" or "ip:<ip>" or "pair:<ip>:<email>"
  private final ConcurrentHashMap<String, AttemptRecord> attemptStore = new ConcurrentHashMap<>();

  public void checkRateLimit(String clientIp, String email) {
    Instant now = Instant.now();

    // 1. Check account-level rate limit (prevents distributed brute-force using rotating spoofed
    // IPs)
    if (email != null && !email.isBlank()) {
      String emailKey = "email:" + email.trim().toLowerCase();
      checkKey(
          emailKey,
          now,
          "Tài khoản này đã bị tạm khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ");
    }

    // 2. Check pair-level rate limit
    String pairKey = buildPairKey(clientIp, email);
    checkKey(pairKey, now, "Bạn đã thực hiện quá nhiều lần thử thất bại. Vui lòng thử lại sau ");
  }

  private void checkKey(String key, Instant now, String messagePrefix) {
    AttemptRecord record = attemptStore.get(key);
    if (record != null && record.lockedUntil != null && now.isBefore(record.lockedUntil)) {
      long remaining = record.lockedUntil.getEpochSecond() - now.getEpochSecond();
      throw new RateLimitExceededException(
          messagePrefix + Math.max(1, remaining) + " giây.", Math.max(1, remaining));
    }
  }

  public void recordFailedAttempt(String clientIp, String email) {
    Instant now = Instant.now();

    // 1. Record on account level
    if (email != null && !email.isBlank()) {
      recordKey("email:" + email.trim().toLowerCase(), now);
    }

    // 2. Record on IP+email level
    recordKey(buildPairKey(clientIp, email), now);
  }

  private void recordKey(String key, Instant now) {
    attemptStore.compute(
        key,
        (k, existing) -> {
          if (existing == null
              || now.isAfter(existing.firstAttemptAt.plusSeconds(LOCKOUT_DURATION_SECONDS))) {
            return new AttemptRecord(now);
          }

          existing.attempts++;
          if (existing.attempts >= MAX_FAILED_ATTEMPTS) {
            existing.lockedUntil = now.plusSeconds(LOCKOUT_DURATION_SECONDS);
          }
          return existing;
        });
  }

  public void resetAttempts(String clientIp, String email) {
    if (email != null && !email.isBlank()) {
      attemptStore.remove("email:" + email.trim().toLowerCase());
    }
    attemptStore.remove(buildPairKey(clientIp, email));
  }

  public long getRemainingLockoutSeconds(String clientIp, String email) {
    Instant now = Instant.now();
    long remaining = 0;
    if (email != null && !email.isBlank()) {
      AttemptRecord emailRecord = attemptStore.get("email:" + email.trim().toLowerCase());
      if (emailRecord != null
          && emailRecord.lockedUntil != null
          && now.isBefore(emailRecord.lockedUntil)) {
        remaining =
            Math.max(remaining, emailRecord.lockedUntil.getEpochSecond() - now.getEpochSecond());
      }
    }
    AttemptRecord pairRecord = attemptStore.get(buildPairKey(clientIp, email));
    if (pairRecord != null
        && pairRecord.lockedUntil != null
        && now.isBefore(pairRecord.lockedUntil)) {
      remaining =
          Math.max(remaining, pairRecord.lockedUntil.getEpochSecond() - now.getEpochSecond());
    }
    return remaining;
  }

  public void clearAll() {
    attemptStore.clear();
  }

  private String buildPairKey(String clientIp, String email) {
    String safeIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "unknown_ip";
    String safeEmail =
        (email != null && !email.isBlank()) ? email.trim().toLowerCase() : "unknown_email";
    return "pair:" + safeIp + ":" + safeEmail;
  }
}
