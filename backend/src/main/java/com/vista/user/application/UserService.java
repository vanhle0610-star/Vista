package com.vista.user.application;

import com.vista.auth.api.dto.UserResponse;
import com.vista.common.audit.AuditLogService;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final AuditLogService auditLogService;

  public UserService(UserRepository userRepository, AuditLogService auditLogService) {
    this.userRepository = userRepository;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public UserResponse getProfile(UUID userId) {
    UserEntity user = findUserOrThrow(userId);
    return toUserResponse(user);
  }

  @Transactional
  public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
    UserEntity user = findUserOrThrow(userId);

    if (request.displayName() != null && !request.displayName().isBlank()) {
      user.setDisplayName(request.displayName().trim());
    }
    if (request.phoneNumber() != null) {
      user.setPhoneNumber(request.phoneNumber().isBlank() ? null : request.phoneNumber().trim());
    }
    if (request.avatarUrl() != null) {
      user.setAvatarUrl(request.avatarUrl().isBlank() ? null : request.avatarUrl().trim());
    }

    UserEntity updatedUser = userRepository.save(user);

    auditLogService.logAction(
        userId,
        "PROFILE_UPDATED",
        "USER",
        userId.toString(),
        "Cập nhật thông tin hồ sơ cá nhân thành công");

    return toUserResponse(updatedUser);
  }

  private UserEntity findUserOrThrow(UUID userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(
            () -> new BadCredentialsException("Không tìm thấy thông tin tài khoản người dùng"));
  }

  private UserResponse toUserResponse(UserEntity user) {
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
