package com.vista.user;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.auth.api.dto.UserResponse;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.user.api.UserController;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.application.UserService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class UserControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean private UserService userService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final UUID testUserId = UUID.randomUUID();

  @Test
  @WithMockUser
  @DisplayName("GET /api/v1/users/me returns 200 OK with UserResponse when authenticated")
  void getProfile_whenAuthenticated_returns200() throws Exception {
    var response =
        new UserResponse(
            testUserId,
            "test@vista.vn",
            "Nguyen Van A",
            "https://avatar.example.com/a.png",
            "ACTIVE",
            List.of("ROLE_USER"),
            "+84912345678");

    when(currentUserProvider.getCurrentUserId()).thenReturn(testUserId);
    when(userService.getProfile(testUserId)).thenReturn(response);

    mockMvc
        .perform(get("/api/v1/users/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(testUserId.toString()))
        .andExpect(jsonPath("$.email").value("test@vista.vn"))
        .andExpect(jsonPath("$.displayName").value("Nguyen Van A"))
        .andExpect(jsonPath("$.phoneNumber").value("+84912345678"));
  }

  @Test
  @DisplayName("GET /api/v1/users/me returns 401 Unauthorized when unauthenticated")
  void getProfile_whenUnauthenticated_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser
  @DisplayName("PATCH /api/v1/users/me returns 200 OK with updated profile when valid")
  void updateProfile_whenAuthenticatedAndValid_returns200() throws Exception {
    var request =
        new UpdateProfileRequest(
            "Nguyen Van B", "+84987654321", "https://avatar.example.com/b.png");
    var response =
        new UserResponse(
            testUserId,
            "test@vista.vn",
            "Nguyen Van B",
            "https://avatar.example.com/b.png",
            "ACTIVE",
            List.of("ROLE_USER"),
            "+84987654321");

    when(currentUserProvider.getCurrentUserId()).thenReturn(testUserId);
    when(userService.updateProfile(eq(testUserId), any(UpdateProfileRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("Nguyen Van B"))
        .andExpect(jsonPath("$.phoneNumber").value("+84987654321"))
        .andExpect(jsonPath("$.avatarUrl").value("https://avatar.example.com/b.png"));
  }

  @Test
  @DisplayName("PATCH /api/v1/users/me returns 401 Unauthorized when unauthenticated")
  void updateProfile_whenUnauthenticated_returns401() throws Exception {
    var request = new UpdateProfileRequest("Nguyen Van B", "+84987654321", null);

    mockMvc
        .perform(
            patch("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser
  @DisplayName("PATCH /api/v1/users/me returns 400 Bad Request when validation fails")
  void updateProfile_whenInvalidPhoneFormat_returns400() throws Exception {
    // Phone number contains letters which violates pattern
    var request = new UpdateProfileRequest("Valid Name", "invalid-phone", null);

    mockMvc
        .perform(
            patch("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }
}
