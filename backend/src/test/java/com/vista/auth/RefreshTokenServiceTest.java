package com.vista.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.vista.auth.application.RefreshTokenService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RefreshTokenServiceTest {

  private RefreshTokenService refreshTokenService;

  @BeforeEach
  void setUp() {
    refreshTokenService = new RefreshTokenService(null);
  }

  @Test
  void unknownTokenReturnsFalseOnIsValid() {
    // Unknown or forged refresh tokens must NEVER be accepted
    assertThat(refreshTokenService.isValid("unregistered.random.token")).isFalse();
    assertThat(refreshTokenService.isValid("")).isFalse();
    assertThat(refreshTokenService.isValid(null)).isFalse();
  }

  @Test
  void registeredTokenReturnsTrueOnIsValid() {
    UUID userId = UUID.randomUUID();
    String token = "valid.registered.token";
    Instant future = Instant.now().plusSeconds(3600);

    refreshTokenService.registerToken(userId, token, future);

    assertThat(refreshTokenService.isValid(token)).isTrue();
    assertThat(refreshTokenService.isRevoked(token)).isFalse();
  }

  @Test
  void revokedTokenReturnsFalseOnIsValid() {
    UUID userId = UUID.randomUUID();
    String token = "will.be.revoked.token";
    Instant future = Instant.now().plusSeconds(3600);

    refreshTokenService.registerToken(userId, token, future);
    assertThat(refreshTokenService.isValid(token)).isTrue();

    refreshTokenService.revokeToken(token);

    assertThat(refreshTokenService.isValid(token)).isFalse();
    assertThat(refreshTokenService.isRevoked(token)).isTrue();
  }

  @Test
  void revokingAllUserTokensInvalidatesAllSessionsForCompromisedUser() {
    UUID compromisedUserId = UUID.randomUUID();
    UUID otherUserId = UUID.randomUUID();

    String token1 = "token.session.1";
    String token2 = "token.session.2";
    String otherToken = "token.other.user";
    Instant future = Instant.now().plusSeconds(3600);

    refreshTokenService.registerToken(compromisedUserId, token1, future);
    refreshTokenService.registerToken(compromisedUserId, token2, future);
    refreshTokenService.registerToken(otherUserId, otherToken, future);

    // Revoke all tokens for compromised user
    refreshTokenService.revokeAllUserTokens(compromisedUserId);

    assertThat(refreshTokenService.isValid(token1)).isFalse();
    assertThat(refreshTokenService.isValid(token2)).isFalse();
    assertThat(refreshTokenService.isRevoked(token1)).isTrue();
    assertThat(refreshTokenService.isRevoked(token2)).isTrue();

    // Other user remains unaffected
    assertThat(refreshTokenService.isValid(otherToken)).isTrue();
  }
}
