package com.vista.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.vista.auth.application.JwtTokenService;
import com.vista.auth.config.JwtProperties;
import com.vista.auth.domain.RoleEntity;
import com.vista.user.domain.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtTokenServiceTest {

  private JwtTokenService jwtTokenService;

  @BeforeEach
  void setUp() {
    var props =
        new JwtProperties(
            "test-secret-key-that-is-long-enough-for-hmac-sha256-compliance-2026!",
            3600000L, // 1 hour
            86400000L // 24 hours
            );
    jwtTokenService = new JwtTokenService(props);
  }

  @Test
  void generatesAndValidatesAccessTokenSuccessfully() {
    var user = new UserEntity("vietnam.travel@vista.vn", "hashed", "Vista Traveler");
    user.addRole(new RoleEntity("USER"));

    var token = jwtTokenService.generateAccessToken(user);
    assertThat(token).isNotBlank();

    var isValid = jwtTokenService.validateToken(token);
    assertThat(isValid).isTrue();

    var claims = jwtTokenService.extractClaims(token);
    assertThat(claims.get("email")).isEqualTo("vietnam.travel@vista.vn");
    assertThat(claims.get("displayName")).isEqualTo("Vista Traveler");

    var roles = jwtTokenService.extractRoles(token);
    assertThat(roles).contains("ROLE_USER");
  }

  @Test
  void rejectsInvalidTokens() {
    assertThat(jwtTokenService.validateToken("invalid.jwt.token")).isFalse();
    assertThat(jwtTokenService.validateToken("")).isFalse();
  }

  @Test
  void generatesRefreshTokenWithCorrectType() {
    var user = new UserEntity("refresh.test@vista.vn", "hashed", "Refresh User");
    var token = jwtTokenService.generateRefreshToken(user);

    assertThat(token).isNotBlank();
    var claims = jwtTokenService.extractClaims(token);
    assertThat(claims.get("type")).isEqualTo("refresh");
  }

  @Test
  void validateAccessTokenRejectsRefreshToken() {
    var user = new UserEntity("swap@vista.vn", "hashed", "Swap User");
    var refreshToken = jwtTokenService.generateRefreshToken(user);

    // Refresh token must NOT be accepted as access token
    assertThat(jwtTokenService.validateAccessToken(refreshToken)).isFalse();
  }

  @Test
  void validateRefreshTokenRejectsAccessToken() {
    var user = new UserEntity("swap@vista.vn", "hashed", "Swap User");
    var accessToken = jwtTokenService.generateAccessToken(user);

    // Access token must NOT be accepted as refresh token
    assertThat(jwtTokenService.validateRefreshToken(accessToken)).isFalse();
  }

  @Test
  void validateAccessTokenAcceptsValidAccessToken() {
    var user = new UserEntity("valid@vista.vn", "hashed", "Valid User");
    var accessToken = jwtTokenService.generateAccessToken(user);

    assertThat(jwtTokenService.validateAccessToken(accessToken)).isTrue();
  }

  @Test
  void failFastThrowsExceptionWhenSecretIsBlank() {
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> new JwtProperties("", 900_000L, 604_800_000L))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("JWT_SECRET không được để trống");
  }

  @Test
  void failFastThrowsExceptionWhenSecretIsShorterThan32Bytes() {
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> new JwtProperties("too-short-secret-1234567890", 900_000L, 604_800_000L))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("JWT_SECRET không đủ an toàn");
  }
}
