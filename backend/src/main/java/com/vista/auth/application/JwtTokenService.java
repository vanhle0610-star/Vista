package com.vista.auth.application;

import com.vista.auth.config.JwtProperties;
import com.vista.user.domain.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

@Service
@EnableConfigurationProperties(JwtProperties.class)
public class JwtTokenService {

  private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);

  public static final String CLAIM_TYPE = "type";
  public static final String TYPE_ACCESS = "access";
  public static final String TYPE_REFRESH = "refresh";

  private final JwtProperties properties;
  private final SecretKey key;

  public JwtTokenService(JwtProperties properties) {
    this.properties = properties;
    this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
  }

  public String generateAccessToken(UserEntity user) {
    var now = Instant.now();
    var expiry = now.plusMillis(properties.accessTokenExpirationMs());
    var userId = user.getId() != null ? user.getId().toString() : UUID.randomUUID().toString();
    var roles =
        user.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    return Jwts.builder()
        .subject(userId)
        .claim(CLAIM_TYPE, TYPE_ACCESS)
        .claim("email", user.getEmail())
        .claim("displayName", user.getDisplayName())
        .claim("roles", roles)
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiry))
        .signWith(key)
        .compact();
  }

  public String generateRefreshToken(UserEntity user) {
    var now = Instant.now();
    var expiry = now.plusMillis(properties.refreshTokenExpirationMs());
    var userId = user.getId() != null ? user.getId().toString() : UUID.randomUUID().toString();

    return Jwts.builder()
        .subject(userId)
        .claim(CLAIM_TYPE, TYPE_REFRESH)
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiry))
        .signWith(key)
        .compact();
  }

  public Claims extractClaims(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }

  public UUID extractUserId(String token) {
    var claims = extractClaims(token);
    return UUID.fromString(claims.getSubject());
  }

  @SuppressWarnings("unchecked")
  public List<String> extractRoles(String token) {
    var claims = extractClaims(token);
    var roles = claims.get("roles", List.class);
    if (roles == null) {
      return List.of();
    }
    return (List<String>) roles;
  }

  public long getRefreshTokenExpirationMs() {
    return properties.refreshTokenExpirationMs();
  }

  public boolean validateToken(String token) {
    try {
      extractClaims(token);
      return true;
    } catch (JwtException | IllegalArgumentException e) {
      log.warn("Invalid JWT token: {}", e.getMessage());
      return false;
    }
  }

  /**
   * Validate that the token is mathematically valid, not expired, AND strictly of type 'access'.
   * Refresh tokens will be rejected.
   */
  public boolean validateAccessToken(String token) {
    if (token == null || token.isBlank()) {
      return false;
    }
    try {
      var claims = extractClaims(token);
      var type = claims.get(CLAIM_TYPE, String.class);
      return TYPE_ACCESS.equalsIgnoreCase(type);
    } catch (JwtException | IllegalArgumentException e) {
      log.warn("Invalid JWT access token: {}", e.getMessage());
      return false;
    }
  }

  /**
   * Validate that the token is mathematically valid, not expired, AND strictly of type 'refresh'.
   * Access tokens will be rejected.
   */
  public boolean validateRefreshToken(String token) {
    if (token == null || token.isBlank()) {
      return false;
    }
    try {
      var claims = extractClaims(token);
      var type = claims.get(CLAIM_TYPE, String.class);
      return TYPE_REFRESH.equalsIgnoreCase(type);
    } catch (JwtException | IllegalArgumentException e) {
      log.warn("Invalid JWT refresh token: {}", e.getMessage());
      return false;
    }
  }
}
