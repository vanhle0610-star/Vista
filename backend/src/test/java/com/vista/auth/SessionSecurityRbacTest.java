package com.vista.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.auth.api.AuthController;
import com.vista.auth.api.dto.AuthResponse;
import com.vista.auth.api.dto.LoginRequest;
import com.vista.auth.api.dto.RefreshTokenRequest;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.application.AuthService;
import com.vista.auth.application.JwtTokenService;
import com.vista.auth.application.LoginRateLimiter;
import com.vista.auth.application.PasswordPolicyValidator;
import com.vista.auth.application.RefreshTokenService;
import com.vista.auth.domain.RoleEntity;
import com.vista.auth.infrastructure.GoogleTokenVerifier;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.common.audit.application.DatabaseAuditLogService;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.JwtAuthenticationFilter;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.security.SecurityCurrentUserProvider;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.application.UserService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

class SessionSecurityRbacTest {

  @Nested
  @ExtendWith(MockitoExtension.class)
  @DisplayName("1. Unit Contract Tests: Auth Lifecycle & Audit Logging (AuthService & UserService)")
  class AuthServiceAuditUnitTests {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenService jwtTokenService;
    @Mock private AuditLogService auditLogService;
    @Mock private GoogleTokenVerifier googleTokenVerifier;
    @Mock private LoginRateLimiter loginRateLimiter;
    @Mock private PasswordPolicyValidator passwordPolicyValidator;
    @Mock private RefreshTokenService refreshTokenService;

    private AuthService authService;
    private UserService userService;

    private final UUID userId = UUID.randomUUID();
    private UserEntity activeUser;

    @BeforeEach
    void setUp() {
      authService =
          new AuthService(
              userRepository,
              roleRepository,
              passwordEncoder,
              jwtTokenService,
              auditLogService,
              googleTokenVerifier,
              loginRateLimiter,
              passwordPolicyValidator,
              refreshTokenService);

      userService = new UserService(userRepository, auditLogService);

      activeUser = new UserEntity("traveler@vista.vn", "hashedPassword", "Traveler One");
      activeUser.addRole(new RoleEntity("USER"));
    }

    @Test
    @DisplayName("1.1. Login thành công: ghi nhận Audit Log LOGIN_SUCCESS")
    void login_success_logs_LOGIN_SUCCESS() {
      var req = new LoginRequest("traveler@vista.vn", "ValidPass123!");
      when(userRepository.findByEmailIgnoreCase("traveler@vista.vn"))
          .thenReturn(Optional.of(activeUser));
      when(passwordEncoder.matches("ValidPass123!", "hashedPassword")).thenReturn(true);
      when(jwtTokenService.generateAccessToken(activeUser)).thenReturn("access_token_123");
      when(jwtTokenService.generateRefreshToken(activeUser)).thenReturn("refresh_token_123");
      when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

      AuthResponse response = authService.login(req, "127.0.0.1");

      assertThat(response).isNotNull();
      assertThat(response.accessToken()).isEqualTo("access_token_123");

      ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("LOGIN_SUCCESS"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              detailsCaptor.capture());

      assertThat(detailsCaptor.getValue()).doesNotContain("ValidPass123!");
      assertThat(detailsCaptor.getValue()).doesNotContain("access_token_123");
    }

    @Test
    @DisplayName("1.2. Login thất bại do sai mật khẩu: ghi nhận Audit Log LOGIN_FAILURE và ném 401")
    void login_failure_wrong_password_logs_LOGIN_FAILURE() {
      var req = new LoginRequest("traveler@vista.vn", "WrongPass!");
      when(userRepository.findByEmailIgnoreCase("traveler@vista.vn"))
          .thenReturn(Optional.of(activeUser));
      when(passwordEncoder.matches("WrongPass!", "hashedPassword")).thenReturn(false);

      assertThatThrownBy(() -> authService.login(req, "127.0.0.1"))
          .isInstanceOf(BadCredentialsException.class)
          .hasMessageContaining("Email hoặc mật khẩu không chính xác");

      ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("LOGIN_FAILURE"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              detailsCaptor.capture());

      // Safe metadata: Password must never be leaked
      assertThat(detailsCaptor.getValue()).doesNotContain("WrongPass!");
    }

    @Test
    @DisplayName(
        "1.3. Login thất bại do email không tồn tại: ghi nhận Audit Log LOGIN_FAILURE an toàn")
    void login_failure_unknown_email_logs_LOGIN_FAILURE() {
      var req = new LoginRequest("unknown@vista.vn", "SomePassword!");
      when(userRepository.findByEmailIgnoreCase("unknown@vista.vn")).thenReturn(Optional.empty());

      assertThatThrownBy(() -> authService.login(req, "127.0.0.1"))
          .isInstanceOf(BadCredentialsException.class)
          .hasMessageContaining("Email hoặc mật khẩu không chính xác");

      ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
      verify(auditLogService)
          .logAction(isNull(), eq("LOGIN_FAILURE"), eq("USER"), isNull(), detailsCaptor.capture());

      assertThat(detailsCaptor.getValue()).doesNotContain("SomePassword!");
    }

    @Test
    @DisplayName("1.4. Login thất bại do tài khoản bị tạm khóa (INACTIVE): ghi nhận LOGIN_FAILURE")
    void login_failure_inactive_user_logs_LOGIN_FAILURE() {
      activeUser.setStatus("INACTIVE");
      var req = new LoginRequest("traveler@vista.vn", "ValidPass123!");
      when(userRepository.findByEmailIgnoreCase("traveler@vista.vn"))
          .thenReturn(Optional.of(activeUser));

      assertThatThrownBy(() -> authService.login(req, "127.0.0.1"))
          .isInstanceOf(BadCredentialsException.class)
          .hasMessageContaining("Tài khoản đã bị tạm khóa");

      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("LOGIN_FAILURE"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }

    @Test
    @DisplayName(
        "1.5. Refresh token thành công: xoay vòng token và ghi nhận Audit Log TOKEN_REFRESH")
    void refreshToken_success_logs_TOKEN_REFRESH() {
      String oldRefreshToken = "old_valid_refresh_jwt";
      when(refreshTokenService.isRevoked(oldRefreshToken)).thenReturn(false);
      when(jwtTokenService.validateRefreshToken(oldRefreshToken)).thenReturn(true);
      when(refreshTokenService.isValid(oldRefreshToken)).thenReturn(true);
      when(jwtTokenService.extractUserId(oldRefreshToken)).thenReturn(activeUser.getId());
      when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
      when(jwtTokenService.generateAccessToken(activeUser)).thenReturn("new_access_token");
      when(jwtTokenService.generateRefreshToken(activeUser)).thenReturn("new_refresh_token");
      when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);
      when(refreshTokenService.tryRevokeActiveToken(oldRefreshToken)).thenReturn(true);

      AuthResponse response = authService.refreshToken(oldRefreshToken);

      assertThat(response.accessToken()).isEqualTo("new_access_token");
      assertThat(response.refreshToken()).isEqualTo("new_refresh_token");

      verify(refreshTokenService).tryRevokeActiveToken(oldRefreshToken);
      verify(refreshTokenService)
          .registerToken(eq(activeUser.getId()), eq("new_refresh_token"), any());

      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("TOKEN_REFRESH"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }

    @Test
    @DisplayName(
        "1.6. Phát hiện tái sử dụng Refresh Token đã revoke: thu hồi toàn bộ session và ghi"
            + " TOKEN_REVOKED")
    void refreshToken_reuse_revoked_token_logs_TOKEN_REVOKED_and_revokesAll() {
      String stolenToken = "stolen_revoked_token";
      when(refreshTokenService.getRecentRotationPayload(stolenToken)).thenReturn(null);
      when(refreshTokenService.isRevoked(stolenToken)).thenReturn(true);
      when(jwtTokenService.extractUserId(stolenToken)).thenReturn(activeUser.getId());

      assertThatThrownBy(() -> authService.refreshToken(stolenToken))
          .isInstanceOf(BadCredentialsException.class)
          .hasMessageContaining("Refresh token đã bị thu hồi hoặc không hợp lệ");

      verify(refreshTokenService).revokeAllUserTokens(activeUser.getId());
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("TOKEN_REVOKED"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }

    @Test
    @DisplayName(
        "1.7. Request đồng thời trong Rotation Grace Window: trả kết quả xoay vòng gần nhất,"
            + " không thu hồi nhầm session")
    void refreshToken_concurrent_served_from_grace_window_without_chain_revocation() {
      String concurrentToken = "concurrent_active_token";
      AuthResponse cachedResponse =
          new AuthResponse(
              activeUser.getId(),
              activeUser.getEmail(),
              activeUser.getDisplayName(),
              "cached_access_token",
              "cached_refresh_token",
              List.of("ROLE_USER"));

      when(refreshTokenService.getRecentRotationPayload(concurrentToken))
          .thenReturn(cachedResponse);

      AuthResponse result = authService.refreshToken(concurrentToken);

      assertThat(result).isNotNull();
      assertThat(result.accessToken()).isEqualTo("cached_access_token");
      assertThat(result.refreshToken()).isEqualTo("cached_refresh_token");

      // Verify NO full-chain revocation was triggered
      verify(refreshTokenService, never()).revokeAllUserTokens(any());
      verify(refreshTokenService, never()).revokeToken(any());
    }

    @Test
    @DisplayName(
        "1.7b. Concurrency Multi-Instance: Khi tryRevokeActiveToken thất bại (affected = 0) do"
            + " phiên khác đã quay vòng, trả về payload nếu trong Grace Window")
    void refreshToken_multiInstanceRace_servesFromGraceWindow() {
      String concurrentToken = "multi_instance_race_refresh_token";
      when(refreshTokenService.getRecentRotationPayload(concurrentToken))
          .thenReturn(null)
          .thenReturn(
              new AuthResponse(
                  activeUser.getId(),
                  activeUser.getEmail(),
                  activeUser.getDisplayName(),
                  "recent_access_token",
                  "recent_refresh_token",
                  List.of("ROLE_USER")));

      when(refreshTokenService.isRevoked(concurrentToken)).thenReturn(false);
      when(jwtTokenService.validateRefreshToken(concurrentToken)).thenReturn(true);
      when(refreshTokenService.isValid(concurrentToken)).thenReturn(true);
      when(jwtTokenService.extractUserId(concurrentToken)).thenReturn(activeUser.getId());
      when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
      when(refreshTokenService.tryRevokeActiveToken(concurrentToken)).thenReturn(false);

      AuthResponse result = authService.refreshToken(concurrentToken);

      assertThat(result).isNotNull();
      assertThat(result.accessToken()).isEqualTo("recent_access_token");
      assertThat(result.refreshToken()).isEqualTo("recent_refresh_token");
      verify(refreshTokenService, never()).revokeAllUserTokens(any());
    }

    @Test
    @DisplayName(
        "1.7c. Concurrency Multi-Instance: Khi tryRevokeActiveToken thất bại (affected = 0) và"
            + " ngoài Grace Window, coi như bị chiếm đoạt và thu hồi toàn bộ chuỗi")
    void refreshToken_multiInstanceRace_outsideGrace_triggersFullChainRevocation() {
      String concurrentToken = "stolen_or_expired_race_token";
      when(refreshTokenService.getRecentRotationPayload(concurrentToken)).thenReturn(null);
      when(refreshTokenService.isRevoked(concurrentToken)).thenReturn(false);
      when(jwtTokenService.validateRefreshToken(concurrentToken)).thenReturn(true);
      when(refreshTokenService.isValid(concurrentToken)).thenReturn(true);
      when(jwtTokenService.extractUserId(concurrentToken)).thenReturn(activeUser.getId());
      when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
      when(refreshTokenService.tryRevokeActiveToken(concurrentToken)).thenReturn(false);

      assertThatThrownBy(() -> authService.refreshToken(concurrentToken))
          .isInstanceOf(BadCredentialsException.class)
          .hasMessageContaining("Refresh token đã bị thu hồi hoặc không hợp lệ");

      verify(refreshTokenService).revokeAllUserTokens(activeUser.getId());
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("TOKEN_REVOKED"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }

    @Test
    @DisplayName("1.8. Logout thành công: thu hồi refresh token và ghi nhận Audit Log LOGOUT")
    void logout_success_logs_LOGOUT() {
      String activeToken = "user_active_refresh_token";
      when(jwtTokenService.extractUserId(activeToken)).thenReturn(activeUser.getId());

      authService.logout(activeToken);

      verify(refreshTokenService).revokeToken(activeToken);
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("LOGOUT"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }

    @Test
    @DisplayName("1.9. Cập nhật hồ sơ thành công: ghi nhận Audit Log PROFILE_UPDATED")
    void updateProfile_logs_PROFILE_UPDATED() {
      when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
      when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

      var req = new UpdateProfileRequest("New Name", "+84911223344", "https://img.avatar.png");
      UserResponse res = userService.updateProfile(activeUser.getId(), req);

      assertThat(res.displayName()).isEqualTo("New Name");
      verify(auditLogService)
          .logAction(
              eq(activeUser.getId()),
              eq("PROFILE_UPDATED"),
              eq("USER"),
              eq(activeUser.getId().toString()),
              any());
    }
  }

  @Nested
  @DisplayName("2. Database Audit Log Sanitization Contract Tests")
  class DatabaseAuditLogSanitizationTests {

    @Test
    @DisplayName(
        "2.1. Audit Sanitizer che giấu triệt để Token, Password, Secret, API Key và Authorization"
            + " Header trong khi giữ nguyên trường 'key' nghiệp vụ")
    void audit_sanitizer_redacts_credentials_and_tokens() {
      AuditLogRepository mockRepo = org.mockito.Mockito.mock(AuditLogRepository.class);
      DatabaseAuditLogService service = new DatabaseAuditLogService(mockRepo, new ObjectMapper());

      String rawDetails =
          """
          {"token": "secret_jwt_token_12345", "password": "SuperSecretPassword!", "authorization": "Bearer eyJhbGciOi...", "apiKey": "AIzaSyD-12345", "geminiApiKey": "AIzaSyGemini-999", "key": "sort_column"}
          """;

      String sanitized = service.sanitize(rawDetails);

      assertThat(sanitized).doesNotContain("secret_jwt_token_12345");
      assertThat(sanitized).doesNotContain("SuperSecretPassword!");
      assertThat(sanitized).doesNotContain("eyJhbGciOi...");
      assertThat(sanitized).doesNotContain("AIzaSyD-12345");
      assertThat(sanitized).doesNotContain("AIzaSyGemini-999");
      assertThat(sanitized).contains("\"token\":\"[REDACTED]\"");
      assertThat(sanitized).contains("\"password\":\"[REDACTED]\"");
      assertThat(sanitized).contains("\"authorization\":\"[REDACTED]\"");
      assertThat(sanitized).contains("\"apiKey\":\"[REDACTED]\"");
      assertThat(sanitized).contains("\"geminiApiKey\":\"[REDACTED]\"");
      assertThat(sanitized).contains("\"key\":\"sort_column\"");
    }
  }

  @Nested
  @WebMvcTest(controllers = {AuthController.class})
  @Import({
    SecurityConfiguration.class,
    JwtAuthenticationFilter.class,
    SecurityCurrentUserProvider.class,
    GlobalExceptionHandler.class
  })
  @DisplayName("3. WebMvc Controller Tests: Token Expiration & Endpoints Routing")
  class AuthWebMvcEndpointTests {

    @Autowired private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean private AuthService authService;
    @MockitoBean private JwtTokenService jwtTokenService;
    @MockitoBean private CurrentUserProvider currentUserProvider;

    @Test
    @DisplayName(
        "3.1. Truy cập protected endpoint với Access Token hết hạn -> Bị từ chối HTTP 401"
            + " UNAUTHORIZED")
    void expired_access_token_rejected_with_401() throws Exception {
      String expiredToken = "expired.jwt.token";
      when(jwtTokenService.validateAccessToken(expiredToken)).thenReturn(false);

      mockMvc
          .perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + expiredToken))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
          .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName(
        "3.2. Cả /api/v1/auth/refresh và /api/v1/auth/refresh-token đều gọi được và xoay vòng token"
            + " hợp lệ")
    void both_refresh_and_refresh_token_endpoints_are_supported() throws Exception {
      var req = new RefreshTokenRequest("valid_refresh_token");
      var res =
          new AuthResponse(
              UUID.randomUUID(),
              "user@vista.vn",
              "User",
              "new_access",
              "new_refresh",
              List.of("ROLE_USER"));

      when(authService.refreshToken("valid_refresh_token")).thenReturn(res);

      // Call /api/v1/auth/refresh
      mockMvc
          .perform(
              post("/api/v1/auth/refresh")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(req)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.accessToken").value("new_access"))
          .andExpect(jsonPath("$.refreshToken").value("new_refresh"));

      // Call /api/v1/auth/refresh-token
      mockMvc
          .perform(
              post("/api/v1/auth/refresh-token")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(req)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.accessToken").value("new_access"))
          .andExpect(jsonPath("$.refreshToken").value("new_refresh"));
    }
  }

  @Nested
  @DisplayName("4. Refresh Token Concurrency, Persistence & Cleanup Tests (Fail-Closed & Rotation)")
  class RefreshTokenConcurrencyAndPersistenceTests {

    @Test
    @DisplayName(
        "4.1. Fail-closed: Khi Database lỗi lúc registerToken, hệ thống ném ngoại lệ chứ không âm"
            + " thầm fallback RAM")
    void registerToken_whenDatabaseFails_failsClosedWithPersistenceException() {
      RefreshTokenRepository mockRepo = org.mockito.Mockito.mock(RefreshTokenRepository.class);
      when(mockRepo.save(any())).thenThrow(new RuntimeException("PostgreSQL connection timeout"));

      RefreshTokenService service = new RefreshTokenService(mockRepo);
      UUID testUserId = UUID.randomUUID();
      String testToken = "test_raw_refresh_token_fail_closed";
      Instant expiresAt = Instant.now().plusSeconds(3600);

      assertThatThrownBy(() -> service.registerToken(testUserId, testToken, expiresAt))
          .isInstanceOf(com.vista.auth.exception.RefreshTokenPersistenceException.class)
          .hasMessageContaining("Không thể lưu refresh token vào cơ sở dữ liệu");

      // Verify that after failed DB write, token is NOT marked valid in memory
      assertThat(service.isValid(testToken)).isFalse();
    }

    @Test
    @DisplayName(
        "4.2. Fail-closed: Khi Database lỗi lúc revokeToken, hệ thống ném ngoại lệ để rollback"
            + " transaction")
    void revokeToken_whenDatabaseFails_failsClosedWithPersistenceException() {
      RefreshTokenRepository mockRepo = org.mockito.Mockito.mock(RefreshTokenRepository.class);
      when(mockRepo.revokeIfActive(any())).thenThrow(new RuntimeException("DB Disk Full"));

      RefreshTokenService service = new RefreshTokenService(mockRepo);
      String testToken = "test_raw_token_to_revoke";

      assertThatThrownBy(() -> service.revokeToken(testToken))
          .isInstanceOf(com.vista.auth.exception.RefreshTokenPersistenceException.class)
          .hasMessageContaining("Không thể cập nhật trạng thái thu hồi");
    }

    @Test
    @DisplayName(
        "4.3. Concurrency Protection: Lưu và truy xuất kết quả xoay vòng trong Grace Window")
    void rotationGraceWindow_servesConcurrentRequestsIdempotently() {
      RefreshTokenService service = new RefreshTokenService(null);
      UUID testUserId = UUID.randomUUID();
      String oldToken = "old_rotated_refresh_token";

      AuthResponse authResponse =
          new AuthResponse(
              testUserId,
              "test@vista.vn",
              "Test User",
              "fresh_access_token",
              "fresh_refresh_token",
              List.of("ROLE_USER"));

      // Record rotation
      service.recordRotation(oldToken, testUserId, authResponse);

      // Concurrent request within grace period retrieves the cached AuthResponse
      Object cached = service.getRecentRotationPayload(oldToken);
      assertThat(cached).isNotNull();
      assertThat(cached).isInstanceOf(AuthResponse.class);
      assertThat(((AuthResponse) cached).accessToken()).isEqualTo("fresh_access_token");
      assertThat(((AuthResponse) cached).refreshToken()).isEqualTo("fresh_refresh_token");
    }

    @Test
    @DisplayName("4.4. Token Cleanup: Dọn dẹp token hết hạn khỏi memoryStore và database")
    void cleanupExpiredTokens_purgesExpiredRecords() {
      RefreshTokenRepository mockRepo = org.mockito.Mockito.mock(RefreshTokenRepository.class);
      when(mockRepo.deleteExpiredTokens(any())).thenReturn(5);

      RefreshTokenService service = new RefreshTokenService(mockRepo);
      UUID testUserId = UUID.randomUUID();

      // Register active token (valid for 1 hour)
      service.registerToken(testUserId, "active_valid_token", Instant.now().plusSeconds(3600));

      // Clean up expired tokens
      int purgedCount = service.cleanupExpiredTokens();

      assertThat(purgedCount).isEqualTo(5);
      // Active token must remain valid
      assertThat(service.isValid("active_valid_token")).isTrue();
      verify(mockRepo).deleteExpiredTokens(any());
    }

    @Test
    @DisplayName(
        "4.5. Atomic DB Rotation: revokeIfActive trả về 1 khi token active và 0 khi đã thu hồi")
    void tryRevokeActiveToken_atomicDatabaseState() {
      RefreshTokenRepository mockRepo = org.mockito.Mockito.mock(RefreshTokenRepository.class);
      RefreshTokenService service = new RefreshTokenService(mockRepo);

      String activeToken = "token_1";
      String alreadyRevokedToken = "token_2";
      String hashActive = service.hashToken(activeToken);
      String hashRevoked = service.hashToken(alreadyRevokedToken);

      when(mockRepo.revokeIfActive(hashActive)).thenReturn(1);
      when(mockRepo.revokeIfActive(hashRevoked)).thenReturn(0);

      assertThat(service.tryRevokeActiveToken(activeToken)).isTrue();
      assertThat(service.tryRevokeActiveToken(alreadyRevokedToken)).isFalse();
    }

    @Test
    @DisplayName("4.6. Memory Consistency: Xóa khỏi memoryStore khi persist vào database thất bại")
    void registerToken_whenDatabaseFails_evictsFromMemoryStore() {
      RefreshTokenRepository mockRepo = org.mockito.Mockito.mock(RefreshTokenRepository.class);
      when(mockRepo.save(any())).thenThrow(new RuntimeException("DB Connection Timeout"));

      RefreshTokenService service = new RefreshTokenService(mockRepo);
      UUID testUserId = UUID.randomUUID();
      String token = "unpersisted_token";

      assertThatThrownBy(
              () -> service.registerToken(testUserId, token, Instant.now().plusSeconds(3600)))
          .isInstanceOf(com.vista.auth.exception.RefreshTokenPersistenceException.class);

      assertThat(service.isTokenInMemory(token)).isFalse();
    }
  }
}
