package com.vista.auth.api;

import com.vista.auth.api.dto.AuthResponse;
import com.vista.auth.api.dto.GoogleLoginRequest;
import com.vista.auth.api.dto.LoginRequest;
import com.vista.auth.api.dto.RefreshTokenRequest;
import com.vista.auth.api.dto.RegisterRequest;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.application.AuthService;
import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(
    name = "Authentication",
    description = "Các API đăng ký, đăng nhập và thông tin tài khoản người dùng")
public class AuthController {

  private static final String REFRESH_TOKEN_COOKIE = "vista_refresh_token";

  private final AuthService authService;
  private final CurrentUserProvider currentUserProvider;

  public AuthController(AuthService authService, CurrentUserProvider currentUserProvider) {
    this.authService = authService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping("/register")
  @Operation(summary = "Đăng ký tài khoản người dùng mới (Mặc định gán vai trò USER)")
  public ResponseEntity<AuthResponse> register(
      @Valid @RequestBody RegisterRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    String clientIp = extractClientIp(httpRequest);
    var response = authService.register(request, clientIp);
    setRefreshTokenCookie(httpRequest, httpResponse, response.refreshToken());
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/login")
  @Operation(summary = "Đăng nhập và nhận JWT Access Token")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    String clientIp = extractClientIp(httpRequest);
    var response = authService.login(request, clientIp);
    setRefreshTokenCookie(httpRequest, httpResponse, response.refreshToken());
    return ResponseEntity.ok(response);
  }

  @PostMapping({"/refresh", "/refresh-token"})
  @Operation(summary = "Lấy cặp Access Token & Refresh Token mới thông qua Token Rotation")
  public ResponseEntity<AuthResponse> refresh(
      @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String cookieRefreshToken,
      @RequestBody(required = false) RefreshTokenRequest requestBody,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    String token =
        (cookieRefreshToken != null && !cookieRefreshToken.isBlank())
            ? cookieRefreshToken
            : (requestBody != null ? requestBody.refreshToken() : null);

    var response = authService.refreshToken(token);
    setRefreshTokenCookie(httpRequest, httpResponse, response.refreshToken());
    return ResponseEntity.ok(response);
  }

  @PostMapping("/logout")
  @Operation(summary = "Đăng xuất tài khoản và thu hồi Refresh Token trên máy chủ")
  public ResponseEntity<Void> logout(
      @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String cookieRefreshToken,
      @RequestBody(required = false) RefreshTokenRequest requestBody,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    String token =
        (cookieRefreshToken != null && !cookieRefreshToken.isBlank())
            ? cookieRefreshToken
            : (requestBody != null ? requestBody.refreshToken() : null);

    authService.logout(token);
    clearRefreshTokenCookie(httpRequest, httpResponse);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/google")
  @Operation(summary = "Đăng nhập hoặc đăng ký nhanh bằng Google ID Token (OAuth2)")
  public ResponseEntity<AuthResponse> loginWithGoogle(
      @Valid @RequestBody GoogleLoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    var response = authService.loginWithGoogle(request);
    setRefreshTokenCookie(httpRequest, httpResponse, response.refreshToken());
    return ResponseEntity.ok(response);
  }

  @GetMapping("/me")
  @Operation(
      summary = "Lấy hồ sơ cá nhân của người dùng hiện tại",
      security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<UserResponse> me() {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    var response = authService.getCurrentUser(currentUserId);
    return ResponseEntity.ok(response);
  }

  private String extractClientIp(HttpServletRequest request) {
    String remoteAddr = request.getRemoteAddr();
    String forwarded = request.getHeader("X-Forwarded-For");

    // Only trust X-Forwarded-For if request originated from an internal/local reverse proxy
    if (forwarded != null && !forwarded.isBlank() && isTrustedProxy(remoteAddr)) {
      String clientIp = forwarded.split(",")[0].trim();
      if (clientIp.matches("^[0-9a-fA-F:.]+$") && clientIp.length() <= 45) {
        return clientIp;
      }
    }
    return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "127.0.0.1";
  }

  private boolean isTrustedProxy(String ip) {
    if (ip == null) return false;
    return ip.equals("127.0.0.1")
        || ip.equals("0:0:0:0:0:0:0:1")
        || ip.equals("::1")
        || ip.startsWith("10.")
        || ip.startsWith("192.168.")
        || ip.startsWith("172.");
  }

  private void setRefreshTokenCookie(
      HttpServletRequest request, HttpServletResponse response, String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      return;
    }
    boolean isSecure =
        request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    ResponseCookie cookie =
        ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
            .httpOnly(true)
            .secure(isSecure)
            .path("/api/v1/auth")
            .maxAge(Duration.ofDays(7))
            .sameSite("Lax")
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private void clearRefreshTokenCookie(HttpServletRequest request, HttpServletResponse response) {
    boolean isSecure =
        request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    ResponseCookie cookie =
        ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
            .httpOnly(true)
            .secure(isSecure)
            .path("/api/v1/auth")
            .maxAge(Duration.ZERO)
            .sameSite("Lax")
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
