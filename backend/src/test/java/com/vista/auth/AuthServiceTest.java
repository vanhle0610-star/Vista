package com.vista.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.auth.api.dto.GoogleLoginRequest;
import com.vista.auth.api.dto.LoginRequest;
import com.vista.auth.api.dto.RegisterRequest;
import com.vista.auth.application.AuthService;
import com.vista.auth.application.JwtTokenService;
import com.vista.auth.application.LoginRateLimiter;
import com.vista.auth.application.PasswordPolicyValidator;
import com.vista.auth.application.RefreshTokenService;
import com.vista.auth.domain.RoleEntity;
import com.vista.auth.exception.EmailAlreadyExistsException;
import com.vista.auth.exception.InvalidPasswordException;
import com.vista.auth.exception.RateLimitExceededException;
import com.vista.auth.infrastructure.GoogleTokenVerifier;
import com.vista.auth.infrastructure.GoogleUserPayload;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

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
  }

  @Test
  void registersNewUserSuccessfullyWithUserRole() {
    var req = new RegisterRequest("newuser@vista.vn", "StrongPassword123!", "Nguyen Van A");

    doNothing().when(loginRateLimiter).checkRateLimit(anyString(), eq("newuser@vista.vn"));
    doNothing().when(passwordPolicyValidator).validate("StrongPassword123!");
    when(userRepository.existsByEmailIgnoreCase("newuser@vista.vn")).thenReturn(false);
    when(passwordEncoder.encode("StrongPassword123!")).thenReturn("hashedPassword");
    when(roleRepository.findByCode("USER")).thenReturn(Optional.of(new RoleEntity("USER")));

    var savedUser = new UserEntity("newuser@vista.vn", "hashedPassword", "Nguyen Van A");
    savedUser.addRole(new RoleEntity("USER"));

    when(userRepository.saveAndFlush(any(UserEntity.class))).thenReturn(savedUser);
    when(jwtTokenService.generateAccessToken(any(UserEntity.class))).thenReturn("access_token_xyz");
    when(jwtTokenService.generateRefreshToken(any(UserEntity.class)))
        .thenReturn("refresh_token_xyz");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

    var response = authService.register(req, "127.0.0.1");

    assertThat(response.email()).isEqualTo("newuser@vista.vn");
    assertThat(response.displayName()).isEqualTo("Nguyen Van A");
    assertThat(response.accessToken()).isEqualTo("access_token_xyz");
    assertThat(response.refreshToken()).isEqualTo("refresh_token_xyz");
    assertThat(response.roles()).contains("ROLE_USER");

    verify(refreshTokenService)
        .registerToken(eq(savedUser.getId()), eq("refresh_token_xyz"), any());
  }

  @Test
  void registersNewUserWithPhoneNumberSuccessfully() {
    var req =
        new RegisterRequest(
            "phoneuser@vista.vn", "StrongPassword123!", "Nguyen Van B", "0912345678");

    doNothing().when(loginRateLimiter).checkRateLimit(anyString(), eq("phoneuser@vista.vn"));
    doNothing().when(passwordPolicyValidator).validate("StrongPassword123!");
    when(userRepository.existsByEmailIgnoreCase("phoneuser@vista.vn")).thenReturn(false);
    when(passwordEncoder.encode("StrongPassword123!")).thenReturn("hashedPassword");
    when(roleRepository.findByCode("USER")).thenReturn(Optional.of(new RoleEntity("USER")));

    var savedUser = new UserEntity("phoneuser@vista.vn", "hashedPassword", "Nguyen Van B");
    savedUser.setPhoneNumber("0912345678");
    savedUser.addRole(new RoleEntity("USER"));

    when(userRepository.saveAndFlush(any(UserEntity.class))).thenReturn(savedUser);
    when(jwtTokenService.generateAccessToken(any(UserEntity.class)))
        .thenReturn("access_token_phone");
    when(jwtTokenService.generateRefreshToken(any(UserEntity.class)))
        .thenReturn("refresh_token_phone");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

    var response = authService.register(req, "127.0.0.1");

    assertThat(response.email()).isEqualTo("phoneuser@vista.vn");
    assertThat(savedUser.getPhoneNumber()).isEqualTo("0912345678");
  }

  @Test
  void throwsConflictExceptionWhenEmailAlreadyExists() {
    var req = new RegisterRequest("existing@vista.vn", "StrongPassword123!", "Existing User");
    when(userRepository.existsByEmailIgnoreCase("existing@vista.vn")).thenReturn(true);

    assertThatThrownBy(() -> authService.register(req, "127.0.0.1"))
        .isInstanceOf(EmailAlreadyExistsException.class)
        .hasMessageContaining("Email này đã được sử dụng");
  }

  @Test
  void throwsConflictExceptionWhenRaceConditionHitsDatabaseUniqueConstraint() {
    var req = new RegisterRequest("concurrent@vista.vn", "StrongPassword123!", "Race Condition");
    when(userRepository.existsByEmailIgnoreCase("concurrent@vista.vn")).thenReturn(false);
    when(passwordEncoder.encode(anyString())).thenReturn("hashed");
    when(roleRepository.findByCode("USER")).thenReturn(Optional.of(new RoleEntity("USER")));
    when(userRepository.saveAndFlush(any(UserEntity.class)))
        .thenThrow(
            new DataIntegrityViolationException("duplicate key value violates unique constraint"));

    assertThatThrownBy(() -> authService.register(req, "127.0.0.1"))
        .isInstanceOf(EmailAlreadyExistsException.class)
        .hasMessageContaining("Email này đã được sử dụng");
  }

  @Test
  void throwsInvalidPasswordExceptionWhenPasswordPolicyFails() {
    var req = new RegisterRequest("weak@vista.vn", "123456", "Weak User");
    doThrow(new InvalidPasswordException("Mật khẩu phải có ít nhất 10 ký tự"))
        .when(passwordPolicyValidator)
        .validate("123456");

    assertThatThrownBy(() -> authService.register(req, "127.0.0.1"))
        .isInstanceOf(InvalidPasswordException.class)
        .hasMessageContaining("Mật khẩu phải có ít nhất 10 ký tự");
  }

  @Test
  void loginsSuccessfullyWithCorrectCredentials() {
    var req = new LoginRequest("user@vista.vn", "Password123!");
    var user = new UserEntity("user@vista.vn", "hashedPassword", "User A");
    user.addRole(new RoleEntity("USER"));

    when(userRepository.findByEmailIgnoreCase("user@vista.vn")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("Password123!", "hashedPassword")).thenReturn(true);
    when(jwtTokenService.generateAccessToken(user)).thenReturn("access_token_123");
    when(jwtTokenService.generateRefreshToken(user)).thenReturn("refresh_token_123");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

    var response = authService.login(req, "192.168.1.1");

    assertThat(response.email()).isEqualTo("user@vista.vn");
    assertThat(response.accessToken()).isEqualTo("access_token_123");
    assertThat(response.refreshToken()).isEqualTo("refresh_token_123");
    verify(loginRateLimiter).resetAttempts("192.168.1.1", "user@vista.vn");
  }

  @Test
  void throwsBadCredentialsWhenPasswordDoesNotMatch() {
    var req = new LoginRequest("user@vista.vn", "WrongPassword!");
    var user = new UserEntity("user@vista.vn", "hashedPassword", "User A");

    when(userRepository.findByEmailIgnoreCase("user@vista.vn")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("WrongPassword!", "hashedPassword")).thenReturn(false);

    assertThatThrownBy(() -> authService.login(req, "192.168.1.1"))
        .isInstanceOf(BadCredentialsException.class)
        .hasMessageContaining("Email hoặc mật khẩu không chính xác");

    verify(loginRateLimiter).recordFailedAttempt("192.168.1.1", "user@vista.vn");
  }

  @Test
  void throwsRateLimitExceededExceptionWhenMaxAttemptsExceeded() {
    var req = new LoginRequest("brute@vista.vn", "AnyPass!");
    doThrow(new RateLimitExceededException("Bạn đã thử đăng nhập thất bại quá nhiều lần", 900))
        .when(loginRateLimiter)
        .checkRateLimit("10.0.0.1", "brute@vista.vn");

    assertThatThrownBy(() -> authService.login(req, "10.0.0.1"))
        .isInstanceOf(RateLimitExceededException.class)
        .hasMessageContaining("thử đăng nhập thất bại quá nhiều lần");
  }

  @Test
  void loginsSuccessfullyWithGoogleExistingUser() {
    var req = new GoogleLoginRequest("mock_id_token");
    var payload =
        new GoogleUserPayload(
            "google.user@vista.vn", "Google Traveler", "https://avatar.url/img.png", "sub123");
    var existingUser = new UserEntity("google.user@vista.vn", "hashed", "Google Traveler");
    existingUser.addRole(new RoleEntity("USER"));

    when(googleTokenVerifier.verify("mock_id_token")).thenReturn(payload);
    when(userRepository.findByEmailIgnoreCase("google.user@vista.vn"))
        .thenReturn(Optional.of(existingUser));
    when(userRepository.save(any(UserEntity.class))).thenReturn(existingUser);
    when(jwtTokenService.generateAccessToken(existingUser)).thenReturn("access_token_google");
    when(jwtTokenService.generateRefreshToken(existingUser)).thenReturn("refresh_token_google");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

    var response = authService.loginWithGoogle(req);

    assertThat(response.email()).isEqualTo("google.user@vista.vn");
    assertThat(response.accessToken()).isEqualTo("access_token_google");
    assertThat(response.roles()).contains("ROLE_USER");
  }

  @Test
  void registersAndLoginsSuccessfullyWithGoogleNewUser() {
    var req = new GoogleLoginRequest("mock_id_token");
    var payload =
        new GoogleUserPayload(
            "new.google@vista.vn", "New Google User", "https://avatar.url/new.png", "sub999");
    var newUser = new UserEntity("new.google@vista.vn", "hashedRandom", "New Google User");
    newUser.addRole(new RoleEntity("USER"));

    when(googleTokenVerifier.verify("mock_id_token")).thenReturn(payload);
    when(userRepository.findByEmailIgnoreCase("new.google@vista.vn")).thenReturn(Optional.empty());
    when(passwordEncoder.encode(any(String.class))).thenReturn("hashedRandom");
    when(roleRepository.findByCode("USER")).thenReturn(Optional.of(new RoleEntity("USER")));
    when(userRepository.save(any(UserEntity.class))).thenReturn(newUser);
    when(jwtTokenService.generateAccessToken(any(UserEntity.class)))
        .thenReturn("access_token_new_google");
    when(jwtTokenService.generateRefreshToken(any(UserEntity.class)))
        .thenReturn("refresh_token_new_google");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

    var response = authService.loginWithGoogle(req);

    assertThat(response.email()).isEqualTo("new.google@vista.vn");
    assertThat(response.displayName()).isEqualTo("New Google User");
    assertThat(response.accessToken()).isEqualTo("access_token_new_google");
  }

  @Test
  void refreshesTokenSuccessfullyWithTokenRotation() {
    var user = new UserEntity("rotate@vista.vn", "hashed", "Rotated User");
    var userId = user.getId();
    user.addRole(new RoleEntity("USER"));

    when(refreshTokenService.isRevoked("valid_old_refresh")).thenReturn(false);
    when(jwtTokenService.validateRefreshToken("valid_old_refresh")).thenReturn(true);
    when(refreshTokenService.isValid("valid_old_refresh")).thenReturn(true);
    when(jwtTokenService.extractUserId("valid_old_refresh")).thenReturn(userId);
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    when(jwtTokenService.generateAccessToken(user)).thenReturn("fresh_access_token");
    when(jwtTokenService.generateRefreshToken(user)).thenReturn("fresh_refresh_token");
    when(jwtTokenService.getRefreshTokenExpirationMs()).thenReturn(604800000L);
    when(refreshTokenService.tryRevokeActiveToken("valid_old_refresh")).thenReturn(true);

    var response = authService.refreshToken("valid_old_refresh");

    assertThat(response.accessToken()).isEqualTo("fresh_access_token");
    assertThat(response.refreshToken()).isEqualTo("fresh_refresh_token");

    verify(refreshTokenService).tryRevokeActiveToken("valid_old_refresh");
    verify(refreshTokenService).registerToken(eq(userId), eq("fresh_refresh_token"), any());
  }

  @Test
  void throwsBadCredentialsWhenAccessTokenIsProvidedToRefreshToken() {
    when(refreshTokenService.isRevoked("access_token_passed_as_refresh")).thenReturn(false);
    when(jwtTokenService.validateRefreshToken("access_token_passed_as_refresh")).thenReturn(false);

    assertThatThrownBy(() -> authService.refreshToken("access_token_passed_as_refresh"))
        .isInstanceOf(BadCredentialsException.class)
        .hasMessageContaining("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  @Test
  void revokesAllUserTokensWhenRevokedTokenIsReused() {
    var userId = UUID.randomUUID();
    when(refreshTokenService.isRevoked("stolen_revoked_token")).thenReturn(true);
    when(jwtTokenService.extractUserId("stolen_revoked_token")).thenReturn(userId);

    assertThatThrownBy(() -> authService.refreshToken("stolen_revoked_token"))
        .isInstanceOf(BadCredentialsException.class)
        .hasMessageContaining("Refresh token đã bị thu hồi hoặc không hợp lệ");

    verify(refreshTokenService).revokeAllUserTokens(userId);
  }

  @Test
  void logoutsSuccessfullyAndRevokesRefreshToken() {
    authService.logout("active_refresh_token");
    verify(refreshTokenService).revokeToken("active_refresh_token");
  }
}
