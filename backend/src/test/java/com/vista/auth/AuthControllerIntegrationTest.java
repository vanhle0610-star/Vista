package com.vista.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.auth.api.AuthController;
import com.vista.auth.api.dto.AuthResponse;
import com.vista.auth.api.dto.LoginRequest;
import com.vista.auth.api.dto.RegisterRequest;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.application.AuthService;
import com.vista.auth.exception.EmailAlreadyExistsException;
import com.vista.auth.exception.RateLimitExceededException;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class AuthControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean private AuthService authService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  @Test
  void registerReturns201CreatedOnValidRequest() throws Exception {
    var req = new RegisterRequest("test@vista.vn", "Password123!", "Vista User");
    var res =
        new AuthResponse(
            UUID.randomUUID(),
            "test@vista.vn",
            "Vista User",
            "access_token_123",
            "refresh_token_123",
            List.of("ROLE_USER"));

    when(authService.register(any(RegisterRequest.class), anyString())).thenReturn(res);

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.email").value("test@vista.vn"))
        .andExpect(jsonPath("$.accessToken").value("access_token_123"))
        .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
        .andExpect(cookie().exists("vista_refresh_token"))
        .andExpect(cookie().httpOnly("vista_refresh_token", true));
  }

  @Test
  void registerReturns409ConflictOnDuplicateEmail() throws Exception {
    var req = new RegisterRequest("duplicate@vista.vn", "Password123!", "Existing User");

    when(authService.register(any(RegisterRequest.class), anyString()))
        .thenThrow(
            new EmailAlreadyExistsException("Email này đã được sử dụng: duplicate@vista.vn"));

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"))
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void registerReturns400BadRequestOnInvalidPayload() throws Exception {
    var req = new RegisterRequest("invalid-email", "123", "");

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.status").value(400));
  }

  @Test
  void registerReturns400BadRequestOnInvalidPhoneNumber() throws Exception {
    var req = new RegisterRequest("valid@vista.vn", "Password123!", "Valid User", "not-a-phone");

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.status").value(400));
  }

  @Test
  void loginReturns200OkOnValidCredentials() throws Exception {
    var req = new LoginRequest("user@vista.vn", "Password123!");
    var res =
        new AuthResponse(
            UUID.randomUUID(),
            "user@vista.vn",
            "Valid User",
            "access_token_abc",
            "refresh_token_abc",
            List.of("ROLE_USER"));

    when(authService.login(any(LoginRequest.class), anyString())).thenReturn(res);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("access_token_abc"))
        .andExpect(cookie().value("vista_refresh_token", "refresh_token_abc"))
        .andExpect(cookie().httpOnly("vista_refresh_token", true));
  }

  @Test
  void loginReturns401UnauthorizedOnBadCredentials() throws Exception {
    var req = new LoginRequest("user@vista.vn", "WrongPassword!");

    when(authService.login(any(LoginRequest.class), anyString()))
        .thenThrow(new BadCredentialsException("Email hoặc mật khẩu không chính xác"));

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  void loginReturns429TooManyRequestsWhenRateLimitExceeded() throws Exception {
    var req = new LoginRequest("user@vista.vn", "Password123!");

    when(authService.login(any(LoginRequest.class), anyString()))
        .thenThrow(
            new RateLimitExceededException("Bạn đã thử đăng nhập thất bại quá nhiều lần", 900));

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().string(HttpHeaders.RETRY_AFTER, "900"))
        .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
        .andExpect(jsonPath("$.retryAfterSeconds").value(900));
  }

  @Test
  void refreshReturns200OkAndRotatedToken() throws Exception {
    var res =
        new AuthResponse(
            UUID.randomUUID(),
            "user@vista.vn",
            "Rotated User",
            "new_access_token",
            "new_refresh_token",
            List.of("ROLE_USER"));

    when(authService.refreshToken("old_valid_refresh_token")).thenReturn(res);

    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .cookie(new Cookie("vista_refresh_token", "old_valid_refresh_token"))
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("new_access_token"))
        .andExpect(jsonPath("$.refreshToken").value("new_refresh_token"))
        .andExpect(cookie().value("vista_refresh_token", "new_refresh_token"));
  }

  @Test
  void logoutReturns204NoContentAndClearsCookie() throws Exception {
    doNothing().when(authService).logout("active_token");

    mockMvc
        .perform(
            post("/api/v1/auth/logout").cookie(new Cookie("vista_refresh_token", "active_token")))
        .andExpect(status().isNoContent())
        .andExpect(cookie().maxAge("vista_refresh_token", 0));

    verify(authService).logout("active_token");
  }

  @Test
  @WithMockUser(
      username = "550e8400-e29b-41d4-a716-446655440000",
      roles = {"USER"})
  void meReturns200OkWhenAuthenticatedUsingCurrentUserProvider() throws Exception {
    var userId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    var userRes =
        new UserResponse(userId, "me@vista.vn", "Me User", null, "ACTIVE", List.of("ROLE_USER"));

    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    when(authService.getCurrentUser(userId)).thenReturn(userRes);

    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("550e8400-e29b-41d4-a716-446655440000"))
        .andExpect(jsonPath("$.email").value("me@vista.vn"))
        .andExpect(jsonPath("$.displayName").value("Me User"));

    verify(currentUserProvider).getCurrentUserId();
  }
}
