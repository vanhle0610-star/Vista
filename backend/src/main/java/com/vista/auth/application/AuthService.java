package com.vista.auth.application;

import com.vista.auth.api.dto.AuthResponse;
import com.vista.auth.api.dto.ForgotPasswordRequest;
import com.vista.auth.api.dto.GoogleLoginRequest;
import com.vista.auth.api.dto.PasswordResetResponse;
import com.vista.auth.api.dto.ResetPasswordRequest;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;
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
import java.util.concurrent.ConcurrentHashMap;
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
  private final ConcurrentHashMap<String, Object> tokenLocks = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, OtpRecord> otpStorage = new ConcurrentHashMap<>();

  public record OtpRecord(String otp, Instant expiresAt) {}

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

    Object lock = tokenLocks.computeIfAbsent(oldRefreshToken, k -> new Object());

    synchronized (lock) {
      try {
        // 1. Check for recent rotation within grace period (concurrency & retry protection)
        Object cachedResponse = refreshTokenService.getRecentRotationPayload(oldRefreshToken);
        if (cachedResponse instanceof AuthResponse recent) {
          log.info(
              "Concurrent refresh token request served from rotation grace period for user: {}",
              recent.id());
          return recent;
        }

        // 2. Check for token reuse / theft (outside grace period)
        if (refreshTokenService.isRevoked(oldRefreshToken)) {
          try {
            UUID compromisedUserId = jwtTokenService.extractUserId(oldRefreshToken);
            refreshTokenService.revokeAllUserTokens(compromisedUserId);
            auditLogService.logAction(
                compromisedUserId,
                "TOKEN_REVOKED",
                "USER",
                compromisedUserId.toString(),
                "Phát hiện sử dụng lại Refresh Token đã thu hồi - Tất cả phiên đăng nhập đã bị vô"
                    + " hiệu hóa");
          } catch (Exception ignored) {
          }
          throw new BadCredentialsException("Refresh token đã bị thu hồi hoặc không hợp lệ");
        }

        // 3. Validate token signature, expiration, and type ('refresh')
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

        // 4. Atomic Rotation: Atomically revoke old refresh token (multi-instance concurrency
        // protection)
        boolean revoked = refreshTokenService.tryRevokeActiveToken(oldRefreshToken);
        if (!revoked) {
          // Check if concurrent rotation finished within grace period
          Object recentResponse = refreshTokenService.getRecentRotationPayload(oldRefreshToken);
          if (recentResponse instanceof AuthResponse recent) {
            log.info(
                "Concurrent multi-instance refresh request served from rotation grace period for"
                    + " user: {}",
                recent.id());
            return recent;
          }

          // Outside grace window or concurrent duplicate -> revoke all tokens (theft detection)
          try {
            refreshTokenService.revokeAllUserTokens(userId);
            auditLogService.logAction(
                userId,
                "TOKEN_REVOKED",
                "USER",
                userId.toString(),
                "Phát hiện sử dụng lại Refresh Token đã thu hồi - Tất cả phiên đăng nhập đã bị vô"
                    + " hiệu hóa");
          } catch (Exception ignored) {
          }
          throw new BadCredentialsException("Refresh token đã bị thu hồi hoặc không hợp lệ");
        }

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

        AuthResponse authResponse =
            new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                newAccessToken,
                newRefreshToken,
                roles);

        // Record rotation for concurrent request grace window
        refreshTokenService.recordRotation(oldRefreshToken, user.getId(), authResponse);

        return authResponse;
      } finally {
        tokenLocks.remove(oldRefreshToken, lock);
      }
    }
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

  public PasswordResetResponse forgotPassword(ForgotPasswordRequest request) {
    var email = request.email().trim().toLowerCase();
    var userOpt = userRepository.findByEmailIgnoreCase(email);
    if (userOpt.isEmpty()) {
      throw new IllegalArgumentException("Không tìm thấy tài khoản với email này trong hệ thống");
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    int randomPin = ThreadLocalRandom.current().nextInt(100000, 1000000);
    String otp = String.valueOf(randomPin);
    Instant expiresAt = Instant.now().plus(Duration.ofMinutes(10));
    otpStorage.put(email, new OtpRecord(otp, expiresAt));

    log.info("Khởi tạo mã OTP khôi phục mật khẩu cho email {}: [OTP={}] (Hết hạn: {})", email, otp, expiresAt);

    return new PasswordResetResponse(
        "Mã xác thực OTP đã được gửi đến email " + email + ". Vui lòng kiểm tra hộp thư!",
        otp
    );
  }

  @Transactional
  public PasswordResetResponse resetPassword(ResetPasswordRequest request) {
    var email = request.email().trim().toLowerCase();
    var user = userRepository.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với email này"));

    var entry = otpStorage.get(email);
    if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
      throw new IllegalArgumentException("Mã xác thực OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu lại!");
    }

    if (!entry.otp().equals(request.otp().trim())) {
      throw new IllegalArgumentException("Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại!");
    }

    // Kiểm tra chính sách mật khẩu mạnh (>= 10 ký tự, blacklist)
    passwordPolicyValidator.validate(request.newPassword());

    // Cập nhật mật khẩu đã mã hóa BCrypt
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);

    // Hủy mã OTP sau khi sử dụng thành công
    otpStorage.remove(email);

    // Thu hồi toàn bộ Refresh Token cũ vì lý do an toàn
    refreshTokenService.revokeAllUserTokens(user.getId());

    // Ghi nhật ký kiểm toán (Audit Log)
    auditLogService.logAction(
        user.getId(),
        "PASSWORD_RESET_SUCCESS",
        "USER",
        user.getId().toString(),
        "Người dùng đã đặt lại mật khẩu thành công qua OTP"
    );

    log.info("Đặt lại mật khẩu thành công cho tài khoản email {}", email);
    return new PasswordResetResponse("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.", null);
  }

}
