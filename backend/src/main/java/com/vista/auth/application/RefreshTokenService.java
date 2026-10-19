package com.vista.auth.application;

import com.vista.auth.domain.RefreshTokenEntity;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

  private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

  public static class StoredRefreshToken {
    private final UUID userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private boolean revoked;

    public StoredRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
      this.userId = userId;
      this.tokenHash = tokenHash;
      this.expiresAt = expiresAt;
      this.revoked = false;
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
      return revoked;
    }

    public void revoke() {
      this.revoked = true;
    }
  }

  private final ConcurrentHashMap<String, StoredRefreshToken> memoryStore =
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
    memoryStore.put(hash, new StoredRefreshToken(userId, hash, expiresAt));

    if (repository != null) {
      try {
        var entity = new RefreshTokenEntity(userId, hash, expiresAt);
        repository.save(entity);
      } catch (Exception e) {
        log.warn("Could not persist refresh token to database: {}", e.getMessage());
      }
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
        repository
            .findByTokenHash(hash)
            .ifPresent(
                entity -> {
                  entity.setRevoked(true);
                  repository.save(entity);
                });
      } catch (Exception e) {
        log.warn("Could not mark refresh token revoked in database: {}", e.getMessage());
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
      } catch (Exception e) {
        log.warn("Could not revoke user refresh tokens in database: {}", e.getMessage());
      }
    }
  }

  public void clearAll() {
    memoryStore.clear();
  }

  private String hashToken(String rawToken) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not supported", e);
    }
  }
}
