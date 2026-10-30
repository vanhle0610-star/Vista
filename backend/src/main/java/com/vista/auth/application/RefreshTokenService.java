package com.vista.auth.application;

import com.vista.auth.domain.RefreshTokenEntity;
import com.vista.auth.exception.RefreshTokenPersistenceException;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class RefreshTokenService {

  private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

  /** Leeway window for handling concurrent refresh requests (10 seconds). */
  private static final long ROTATION_GRACE_PERIOD_MS = 10_000L;

  public static class StoredRefreshToken {
    private final UUID userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private final AtomicBoolean revoked;
    private volatile Instant revokedAt;

    public StoredRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
      this.userId = userId;
      this.tokenHash = tokenHash;
      this.expiresAt = expiresAt;
      this.revoked = new AtomicBoolean(false);
      this.revokedAt = null;
    }

    public UUID getUserId() {
      return userId;
    }

    public String getTokenHash() {
      return tokenHash;
    }

    public Instant getExpiresAt() {
      return expiresAt;
    }

    public boolean isRevoked() {
      return revoked.get();
    }

    public Instant getRevokedAt() {
      return revokedAt;
    }

    public boolean revoke() {
      boolean transitioned = this.revoked.compareAndSet(false, true);
      if (transitioned) {
        this.revokedAt = Instant.now();
      }
      return transitioned;
    }
  }

  public static class RotationRecord {
    private final UUID userId;
    private final Instant rotatedAt;
    private final Object responsePayload;

    public RotationRecord(UUID userId, Instant rotatedAt, Object responsePayload) {
      this.userId = userId;
      this.rotatedAt = rotatedAt;
      this.responsePayload = responsePayload;
    }

    public UUID getUserId() {
      return userId;
    }

    public Instant getRotatedAt() {
      return rotatedAt;
    }

    public Object getResponsePayload() {
      return responsePayload;
    }
  }

  private final ConcurrentHashMap<String, StoredRefreshToken> memoryStore =
      new ConcurrentHashMap<>();

  private final ConcurrentHashMap<String, RotationRecord> recentRotations =
      new ConcurrentHashMap<>();

  private final RefreshTokenRepository repository;

  public RefreshTokenService(@Autowired(required = false) RefreshTokenRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public void registerToken(UUID userId, String rawToken, Instant expiresAt) {
    if (rawToken == null || userId == null) {
      return;
    }
    String hash = hashToken(rawToken);

    // Fail-closed persistence: if database repository exists, it MUST successfully persist
    if (repository != null) {
      try {
        var entity = new RefreshTokenEntity(userId, hash, expiresAt);
        repository.save(entity);
      } catch (Exception e) {
        memoryStore.remove(hash);
        log.error(
            "Fail-closed: could not persist refresh token to database: {}", e.getMessage(), e);
        throw new RefreshTokenPersistenceException(
            "Không thể lưu refresh token vào cơ sở dữ liệu: " + e.getMessage(), e);
      }
    }

    memoryStore.put(hash, new StoredRefreshToken(userId, hash, expiresAt));

    if (TransactionSynchronizationManager.isActualTransactionActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
              if (status != STATUS_COMMITTED) {
                memoryStore.remove(hash);
              }
            }
          });
    }
  }

  /**
   * Strictly validates that the refresh token exists in the registry, is NOT revoked, and NOT
   * expired. Unknown/unregistered tokens are strictly rejected (returns false).
   */
  @Transactional(readOnly = true)
  public boolean isValid(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return false;
    }
    String hash = hashToken(rawToken);
    StoredRefreshToken cached = memoryStore.get(hash);

    if (cached != null) {
      return !cached.isRevoked() && Instant.now().isBefore(cached.getExpiresAt());
    }

    // Check database if not present in memory cache
    if (repository != null) {
      try {
        var entityOpt = repository.findByTokenHash(hash);
        if (entityOpt.isPresent()) {
          var entity = entityOpt.get();
          // Populate memory cache
          var stored = new StoredRefreshToken(entity.getUserId(), hash, entity.getExpiresAt());
          if (entity.isRevoked()) {
            stored.revoke();
          }
          memoryStore.put(hash, stored);
          return !entity.isRevoked() && Instant.now().isBefore(entity.getExpiresAt());
        }
      } catch (Exception e) {
        log.warn("Database lookup for refresh token failed: {}", e.getMessage());
        // Fail-closed on error
        return false;
      }
    }

    // Unregistered token is strictly INVALID!
    return false;
  }

  @Transactional(readOnly = true)
  public boolean isRevoked(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return false;
    }
    String hash = hashToken(rawToken);
    StoredRefreshToken cached = memoryStore.get(hash);
    if (cached != null) {
      return cached.isRevoked();
    }

    if (repository != null) {
      try {
        var entityOpt = repository.findByTokenHash(hash);
        if (entityOpt.isPresent()) {
          return entityOpt.get().isRevoked();
        }
      } catch (Exception e) {
        log.warn("Database lookup for revoked refresh token failed: {}", e.getMessage());
      }
    }
    return false;
  }

  /**
   * Atomically revokes an active refresh token in the database (or memory store if DB is absent).
   *
   * @return true if the token was active and successfully transitioned to revoked (affected rows ==
   *     1). false if the token was already revoked, expired, or non-existent (affected rows == 0).
   */
  @Transactional
  public boolean tryRevokeActiveToken(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return false;
    }
    String hash = hashToken(rawToken);

    if (repository != null) {
      try {
        int affected = repository.revokeIfActive(hash);
        if (affected == 1) {
          StoredRefreshToken cached = memoryStore.get(hash);
          if (cached != null) {
            cached.revoke();
          }
          if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                  @Override
                  public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                      // Evict on rollback so memory does not retain revoked status when DB rolled
                      // back
                      memoryStore.remove(hash);
                    }
                  }
                });
          }
          return true;
        }
        return false;
      } catch (Exception e) {
        memoryStore.remove(hash);
        log.error(
            "Fail-closed: could not atomically revoke refresh token in database: {}",
            e.getMessage(),
            e);
        throw new RefreshTokenPersistenceException(
            "Không thể cập nhật trạng thái thu hồi refresh token vào cơ sở dữ liệu: "
                + e.getMessage(),
            e);
      }
    }

    // In-memory fallback: atomic CAS transition
    StoredRefreshToken cached = memoryStore.get(hash);
    if (cached != null && !cached.isRevoked() && Instant.now().isBefore(cached.getExpiresAt())) {
      return cached.revoke();
    }
    return false;
  }

  @Transactional
  public void revokeToken(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return;
    }
    String hash = hashToken(rawToken);
    StoredRefreshToken cached = memoryStore.get(hash);
    if (cached != null) {
      cached.revoke();
    }

    if (repository != null) {
      try {
        repository.revokeIfActive(hash);
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
          TransactionSynchronizationManager.registerSynchronization(
              new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                  if (status != STATUS_COMMITTED) {
                    memoryStore.remove(hash);
                  }
                }
              });
        }
      } catch (Exception e) {
        memoryStore.remove(hash);
        log.error(
            "Fail-closed: could not mark refresh token revoked in database: {}", e.getMessage(), e);
        throw new RefreshTokenPersistenceException(
            "Không thể cập nhật trạng thái thu hồi refresh token vào cơ sở dữ liệu: "
                + e.getMessage(),
            e);
      }
    }
  }

  @Transactional
  public void revokeAllUserTokens(UUID userId) {
    if (userId == null) {
      return;
    }
    memoryStore.values().stream()
        .filter(t -> userId.equals(t.getUserId()))
        .forEach(StoredRefreshToken::revoke);

    if (repository != null) {
      try {
        repository.revokeAllByUserId(userId);
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
          TransactionSynchronizationManager.registerSynchronization(
              new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                  if (status != STATUS_COMMITTED) {
                    memoryStore
                        .entrySet()
                        .removeIf(entry -> userId.equals(entry.getValue().getUserId()));
                  }
                }
              });
        }
      } catch (Exception e) {
        memoryStore.entrySet().removeIf(entry -> userId.equals(entry.getValue().getUserId()));
        log.error(
            "Fail-closed: could not revoke user refresh tokens in database: {}", e.getMessage(), e);
        throw new RefreshTokenPersistenceException(
            "Không thể thu hồi tất cả refresh token của người dùng trong cơ sở dữ liệu: "
                + e.getMessage(),
            e);
      }
    }
  }

  public boolean isTokenInMemory(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return false;
    }
    return memoryStore.containsKey(hashToken(rawToken));
  }

  /** Caches a recently completed rotation result for concurrency protection. */
  public void recordRotation(String oldRawToken, UUID userId, Object responsePayload) {
    if (oldRawToken == null || oldRawToken.isBlank()) {
      return;
    }
    String hash = hashToken(oldRawToken);
    recentRotations.put(hash, new RotationRecord(userId, Instant.now(), responsePayload));
    pruneRecentRotations();
  }

  /** Returns cached response payload if token was rotated within the grace period (10 seconds). */
  public Object getRecentRotationPayload(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return null;
    }
    String hash = hashToken(rawToken);
    RotationRecord record = recentRotations.get(hash);
    if (record == null) {
      return null;
    }
    if (Instant.now().isBefore(record.getRotatedAt().plusMillis(ROTATION_GRACE_PERIOD_MS))) {
      return record.getResponsePayload();
    }
    recentRotations.remove(hash);
    return null;
  }

  /** Purges expired refresh tokens from both memory and database. */
  @Transactional
  public int cleanupExpiredTokens() {
    Instant now = Instant.now();
    memoryStore.entrySet().removeIf(entry -> entry.getValue().getExpiresAt().isBefore(now));
    pruneRecentRotations();

    if (repository != null) {
      try {
        return repository.deleteExpiredTokens(now);
      } catch (Exception e) {
        log.error("Failed to delete expired refresh tokens from database: {}", e.getMessage(), e);
        throw new RefreshTokenPersistenceException(
            "Lỗi dọn dẹp refresh token hết hạn trong cơ sở dữ liệu: " + e.getMessage(), e);
      }
    }
    return 0;
  }

  public void clearAll() {
    memoryStore.clear();
    recentRotations.clear();
  }

  public String hashToken(String rawToken) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not supported", e);
    }
  }

  private void pruneRecentRotations() {
    Instant cutoff = Instant.now().minusSeconds(60);
    recentRotations.entrySet().removeIf(entry -> entry.getValue().getRotatedAt().isBefore(cutoff));
  }
}
