package com.vista.auth.application;

import com.vista.auth.api.dto.AuthResponse;
import com.vista.auth.api.dto.GoogleLoginRequest;
import com.vista.auth.api.dto.LoginRequest;
import com.vista.auth.api.dto.RegisterRequest;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.domain.RoleEntity;
import com.vista.auth.exception.EmailAlreadyExistsException;
import com.vista.auth.infrastructure.GoogleTokenVerifier;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService jwtTokenService;
  private final AuditLogService auditLogService;
  private final GoogleTokenVerifier googleTokenVerifier;
  private final LoginRateLimiter loginRateLimiter;
  private final PasswordPolicyValidator passwordPolicyValidator;
  private final RefreshTokenService refreshTokenService;

  public AuthService(
      UserRepository userRepository,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenService jwtTokenService,
      AuditLogService auditLogService,
      GoogleTokenVerifier googleTokenVerifier,
      LoginRateLimiter loginRateLimiter,
      PasswordPolicyValidator passwordPolicyValidator,
      RefreshTokenService refreshTokenService) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenService = jwtTokenService;
    this.auditLogService = auditLogService;
    this.googleTokenVerifier = googleTokenVerifier;
    this.loginRateLimiter = loginRateLimiter;
    this.passwordPolicyValidator = passwordPolicyValidator;
    this.refreshTokenService = refreshTokenService;
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    return register(request, "unknown_client");
  }

  @Transactional
  public AuthResponse register(RegisterRequest request, String clientIp) {
    var email = request.email().trim().toLowerCase();

    // 1. Rate limiting check
    loginRateLimiter.checkRateLimit(clientIp, email);

    // 2. Strong Password Policy validation (min 10 chars, blacklist check)
    passwordPolicyValidator.validate(request.password());

    // 3. Early email existence check
    if (userRepository.existsByEmailIgnoreCase(email)) {
      throw new EmailAlreadyExistsException("Email này đã được sử dụng: " + email);
    }

    var passwordHash = passwordEncoder.encode(request.password());
    var user = new UserEntity(email, passwordHash, request.displayName().trim());
    if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
      user.setPhoneNumber(request.phoneNumber().trim());
    }

    var userRole =
        roleRepository
            .findByCode("USER")
            .orElseGet(() -> roleRepository.save(new RoleEntity("USER")));
    user.addRole(userRole);

    UserEntity savedUser;
    try {
      // 4. Handle concurrent race condition at DB level
      savedUser = userRepository.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      log.error(
          "DataIntegrityViolationException during registration of {}: {}",
          email,
          ex.getMessage(),
          ex);
      throw new EmailAlreadyExistsException("Email này đã được sử dụng: " + email);
    }

    loginRateLimiter.resetAttempts(clientIp, email);

    var accessToken = jwtTokenService.generateAccessToken(savedUser);
    var refreshToken = jwtTokenService.generateRefreshToken(savedUser);

    refreshTokenService.registerToken(
        savedUser.getId(),
        refreshToken,
        Instant.now().plusMillis(jwtTokenService.getRefreshTokenExpirationMs()));

    var roles =
        savedUser.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    auditLogService.logAction(
        savedUser.getId(),
        "USER_REGISTERED",
        "USER",
        savedUser.getId().toString(),
        "Tài khoản mới đăng ký thành công");

    return new AuthResponse(
        savedUser.getId(),
        savedUser.getEmail(),
        savedUser.getDisplayName(),
        accessToken,
        refreshToken,
        roles);
  }

  @Transactional(readOnly = true)
  public AuthResponse login(LoginRequest request) {
    return login(request, "unknown_client");
  }

  @Transactional(readOnly = true)
  public AuthResponse login(LoginRequest request, String clientIp) {
    var email = request.email().trim().toLowerCase();

    // 1. Rate limit check (Throws 429 RateLimitExceededException if exceeded)
    loginRateLimiter.checkRateLimit(clientIp, email);

    var userOpt = userRepository.findByEmailIgnoreCase(email);
    if (userOpt.isEmpty()) {
      loginRateLimiter.recordFailedAttempt(clientIp, email);
      auditLogService.logAction(
          null,
          "LOGIN_FAILURE",
          "USER",
          null,
          "Đăng nhập thất bại: thông tin xác thực không chính xác");
      throw new BadCredentialsException("Email hoặc mật khẩu không chính xác");
    }

    var user = userOpt.get();

    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
      loginRateLimiter.recordFailedAttempt(clientIp, email);
      auditLogService.logAction(
          user.getId(),
          "LOGIN_FAILURE",
          "USER",
          user.getId().toString(),
          "Đăng nhập thất bại: tài khoản không hoạt động");
      throw new BadCredentialsException("Tài khoản đã bị tạm khóa hoặc ngừng hoạt động");
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      loginRateLimiter.recordFailedAttempt(clientIp, email);
      auditLogService.logAction(
          user.getId(),
          "LOGIN_FAILURE",
          "USER",
          user.getId().toString(),
          "Đăng nhập thất bại: thông tin xác thực không chính xác");
      throw new BadCredentialsException("Email hoặc mật khẩu không chính xác");
    }

    // Reset rate limiter on successful authentication
    loginRateLimiter.resetAttempts(clientIp, email);

    var accessToken = jwtTokenService.generateAccessToken(user);
    var refreshToken = jwtTokenService.generateRefreshToken(user);

    refreshTokenService.registerToken(
        user.getId(),
        refreshToken,
        Instant.now().plusMillis(jwtTokenService.getRefreshTokenExpirationMs()));

    var roles =
        user.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    auditLogService.logAction(
        user.getId(), "LOGIN_SUCCESS", "USER", user.getId().toString(), "Đăng nhập thành công");

    return new AuthResponse(
        user.getId(), user.getEmail(), user.getDisplayName(), accessToken, refreshToken, roles);
  }

  @Transactional
  public AuthResponse refreshToken(String oldRefreshToken) {
    if (oldRefreshToken == null || oldRefreshToken.isBlank()) {
      throw new BadCredentialsException("Refresh token không được để trống");
    }

    // 1. Check for token reuse / theft
    if (refreshTokenService.isRevoked(oldRefreshToken)) {
      try {
        UUID compromisedUserId = jwtTokenService.extractUserId(oldRefreshToken);
        refreshTokenService.revokeAllUserTokens(compromisedUserId);
        auditLogService.logAction(
            compromisedUserId,
            "TOKEN_REVOKED",
            "USER",
            compromisedUserId.toString(),
            "Phát hiện sử dụng lại Refresh Token đã thu hồi - Tất cả phiên đăng nhập đã bị vô hiệu"
                + " hóa");
      } catch (Exception ignored) {
      }
      throw new BadCredentialsException("Refresh token đã bị thu hồi hoặc không hợp lệ");
    }

    // 2. Validate token signature, expiration, and type ('refresh')
    if (!jwtTokenService.validateRefreshToken(oldRefreshToken)
        || !refreshTokenService.isValid(oldRefreshToken)) {
      throw new BadCredentialsException("Refresh token không hợp lệ hoặc đã hết hạn");
    }

    UUID userId;
    try {
      userId = jwtTokenService.extractUserId(oldRefreshToken);
    } catch (Exception e) {
      throw new BadCredentialsException("Không thể xác thực thông tin từ refresh token");
    }

    var user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () ->
                    new BadCredentialsException(
                        "Không tìm thấy tài khoản người dùng cho token này"));

    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
      throw new BadCredentialsException("Tài khoản đã bị tạm khóa hoặc ngừng hoạt động");
    }

    // 3. Rotation: Revoke old refresh token, issue fresh pair
    refreshTokenService.revokeToken(oldRefreshToken);

    var newAccessToken = jwtTokenService.generateAccessToken(user);
    var newRefreshToken = jwtTokenService.generateRefreshToken(user);

    refreshTokenService.registerToken(
        user.getId(),
        newRefreshToken,
        Instant.now().plusMillis(jwtTokenService.getRefreshTokenExpirationMs()));

    var roles =
        user.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    auditLogService.logAction(
        user.getId(),
        "TOKEN_REFRESH",
        "USER",
        user.getId().toString(),
        "Làm mới access token thành công");

    return new AuthResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        newAccessToken,
        newRefreshToken,
        roles);
  }

  public void logout(String refreshToken) {
    if (refreshToken != null && !refreshToken.isBlank()) {
      refreshTokenService.revokeToken(refreshToken);
      try {
        UUID userId = jwtTokenService.extractUserId(refreshToken);
        auditLogService.logAction(
            userId, "LOGOUT", "USER", userId.toString(), "Đăng xuất thành công");
      } catch (Exception ignored) {
      }
    }
  }

  @Transactional
  public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
    var googleUser = googleTokenVerifier.verify(request.idToken());
    var email = googleUser.email().trim().toLowerCase();

    var existingUserOpt = userRepository.findByEmailIgnoreCase(email);
    UserEntity user;

    if (existingUserOpt.isPresent()) {
      user = existingUserOpt.get();
      if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
        throw new BadCredentialsException("Tài khoản đã bị tạm khóa hoặc ngừng hoạt động");
      }
      if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())
          && googleUser.picture() != null) {
        user.setAvatarUrl(googleUser.picture());
      }
      user = userRepository.save(user);
      auditLogService.logAction(
          user.getId(),
          "USER_LOGGED_IN_GOOGLE",
          "USER",
          user.getId().toString(),
          "Đăng nhập Google thành công");
    } else {
      var randomPassword = passwordEncoder.encode(UUID.randomUUID().toString());
      var displayName =
          (googleUser.name() != null && !googleUser.name().isBlank())
              ? googleUser.name().trim()
              : email.substring(0, email.indexOf('@'));

      user = new UserEntity(email, randomPassword, displayName);
      if (googleUser.picture() != null) {
        user.setAvatarUrl(googleUser.picture());
      }

      var userRole =
          roleRepository
              .findByCode("USER")
              .orElseGet(() -> roleRepository.save(new RoleEntity("USER")));
      user.addRole(userRole);

      user = userRepository.save(user);

      auditLogService.logAction(
          user.getId(),
          "USER_REGISTERED_GOOGLE",
          "USER",
          user.getId().toString(),
          "Tài khoản Google mới đăng ký thành công");
    }

    var accessToken = jwtTokenService.generateAccessToken(user);
    var refreshToken = jwtTokenService.generateRefreshToken(user);

    refreshTokenService.registerToken(
        user.getId(),
        refreshToken,
        Instant.now().plusMillis(jwtTokenService.getRefreshTokenExpirationMs()));

    var roles =
        user.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    return new AuthResponse(
        user.getId(), user.getEmail(), user.getDisplayName(), accessToken, refreshToken, roles);
  }

  @Transactional(readOnly = true)
  public UserResponse getCurrentUser(UUID userId) {
    var user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new BadCredentialsException("Không tìm thấy thông tin tài khoản người dùng"));

    var roles =
        user.getRoles().stream()
            .map(r -> r.getCode().startsWith("ROLE_") ? r.getCode() : "ROLE_" + r.getCode())
            .toList();

    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getAvatarUrl(),
        user.getStatus(),
        roles,
        user.getPhoneNumber());
  }
}
