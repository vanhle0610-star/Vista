package com.vista.auth.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenCleanupService {

  private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupService.class);

  private final RefreshTokenService refreshTokenService;

  public RefreshTokenCleanupService(RefreshTokenService refreshTokenService) {
    this.refreshTokenService = refreshTokenService;
  }

  /** Purges expired refresh tokens daily at 03:00 AM (configurable via property). */
  @Scheduled(cron = "${app.auth.cleanup-cron:0 0 3 * * ?}")
  public void purgeExpiredTokens() {
    try {
      int deletedCount = refreshTokenService.cleanupExpiredTokens();
      log.info("Expired refresh tokens purge complete: {} records deleted", deletedCount);
    } catch (Exception e) {
      log.warn("Failed to purge expired refresh tokens: {}", e.getMessage());
    }
  }
}
