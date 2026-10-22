package com.vista.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.domain.RoleEntity;
import com.vista.common.audit.AuditLogService;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.application.UserService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

class UserServiceTest {

  private UserRepository userRepository;
  private AuditLogService auditLogService;
  private UserService userService;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    userRepository = mock(UserRepository.class);
    auditLogService = mock(AuditLogService.class);
    userService = new UserService(userRepository, auditLogService);
  }

  @Test
  @DisplayName("getProfile returns UserResponse when user exists")
  void getProfile_whenUserExists_returnsUserResponse() {
    var user = new UserEntity("test@vista.vn", "hashedPassword", "Nguyen Van A");
    user.addRole(new RoleEntity("USER"));
    user.setPhoneNumber("+84912345678");

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    UserResponse response = userService.getProfile(userId);

    assertThat(response).isNotNull();
    assertThat(response.email()).isEqualTo("test@vista.vn");
    assertThat(response.displayName()).isEqualTo("Nguyen Van A");
    assertThat(response.phoneNumber()).isEqualTo("+84912345678");
    assertThat(response.status()).isEqualTo("ACTIVE");
    assertThat(response.roles()).contains("ROLE_USER");
  }

  @Test
  @DisplayName("getProfile throws BadCredentialsException when user not found")
  void getProfile_whenUserNotFound_throwsException() {
    when(userRepository.findById(userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.getProfile(userId))
        .isInstanceOf(BadCredentialsException.class)
        .hasMessageContaining("Không tìm thấy thông tin tài khoản người dùng");
  }

  @Test
  @DisplayName("updateProfile updates allowed fields and logs audit action")
  void updateProfile_whenValidFields_updatesUser() {
    var user = new UserEntity("test@vista.vn", "hashedPassword", "Nguyen Van A");
    user.addRole(new RoleEntity("USER"));

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(userRepository.save(any(UserEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var request =
        new UpdateProfileRequest(
            "Nguyen Van B", "+84987654321", "https://avatar.example.com/b.png");
    UserResponse response = userService.updateProfile(userId, request);

    assertThat(response.displayName()).isEqualTo("Nguyen Van B");
    assertThat(response.phoneNumber()).isEqualTo("+84987654321");
    assertThat(response.avatarUrl()).isEqualTo("https://avatar.example.com/b.png");

    verify(auditLogService)
        .logAction(
            eq(userId), eq("USER_PROFILE_UPDATED"), eq("USER"), eq(userId.toString()), any());
  }

  @Test
  @DisplayName("updateProfile with partial fields does not overwrite existing unmentioned fields")
  void updateProfile_withPartialFields_retainsOtherFields() {
    var user = new UserEntity("test@vista.vn", "hashedPassword", "Nguyen Van A");
    user.setPhoneNumber("+84912345678");
    user.setAvatarUrl("https://avatar.example.com/old.png");
    user.addRole(new RoleEntity("USER"));

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(userRepository.save(any(UserEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var request = new UpdateProfileRequest("Nguyen Van New", null, null);
    UserResponse response = userService.updateProfile(userId, request);

    assertThat(response.displayName()).isEqualTo("Nguyen Van New");
    assertThat(response.phoneNumber()).isEqualTo("+84912345678");
    assertThat(response.avatarUrl()).isEqualTo("https://avatar.example.com/old.png");
  }
}
