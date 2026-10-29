package com.vista.user.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.trip.application.TripAccessService;
import com.vista.user.api.dto.ChangePasswordRequest;
import com.vista.user.api.dto.UpdateProfileRequest;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

  private static final Set<String> ALLOWED_PREFERENCES =
      Set.of(
          "BEACH",
          "CULTURE",
          "CUISINE",
          "NATURE",
          "ENTERTAINMENT",
          "PHOTO",
          "CAFE",
          "NIGHTLIFE",
          "ADVENTURE",
          "WELLNESS",
          "WATERSPORTS",
          "CRAFTS");

  private static final Pattern PWD_PATTERN =
      Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$");

  private final UserRepository userRepository;
  private final AuditLogService auditLogService;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenRepository refreshTokenRepository;
  private final ObjectMapper objectMapper;
  private final TripAccessService tripAccessService;

  public UserService(UserRepository userRepository, AuditLogService auditLogService) {
    this(userRepository, auditLogService, null, null, new ObjectMapper(), null);
  }

  public UserService(
      UserRepository userRepository,
      AuditLogService auditLogService,
      PasswordEncoder passwordEncoder,
      RefreshTokenRepository refreshTokenRepository,
      ObjectMapper objectMapper) {
    this(userRepository, auditLogService, passwordEncoder, refreshTokenRepository, objectMapper, null);
  }

  @Autowired
  public UserService(
      UserRepository userRepository,
      AuditLogService auditLogService,
      PasswordEncoder passwordEncoder,
      @Autowired(required = false) RefreshTokenRepository refreshTokenRepository,
      @Autowired(required = false) ObjectMapper objectMapper,
      @Autowired(required = false) TripAccessService tripAccessService) {
    this.userRepository = userRepository;
    this.auditLogService = auditLogService;
    this.passwordEncoder = passwordEncoder;
    this.refreshTokenRepository = refreshTokenRepository;
    this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    this.tripAccessService = tripAccessService;
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
    if (request.bio() != null) {
      user.setBio(request.bio().isBlank() ? null : request.bio().trim());
    }
    if (request.bankCode() != null) {
      user.setBankCode(
          request.bankCode().isBlank() ? null : request.bankCode().trim().toUpperCase());
    }
    if (request.bankBin() != null) {
      user.setBankBin(request.bankBin().isBlank() ? null : request.bankBin().trim());
    }
    if (request.bankAccountNumber() != null) {
      user.setBankAccountNumber(
          request.bankAccountNumber().isBlank() ? null : request.bankAccountNumber().trim());
    }
    if (request.bankAccountName() != null) {
      user.setBankAccountName(
          request.bankAccountName().isBlank()
              ? null
              : request.bankAccountName().trim().toUpperCase());
    }
    if (request.travelPreferences() != null) {
      List<String> validPrefs =
          request.travelPreferences().stream()
              .filter(p -> p != null && !p.isBlank())
              .map(String::trim)
              .map(String::toUpperCase)
              .filter(ALLOWED_PREFERENCES::contains)
              .distinct()
              .toList();
      try {
        user.setTravelPreferences(objectMapper.writeValueAsString(validPrefs));
      } catch (Exception e) {
        user.setTravelPreferences("[]");
      }
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

  @Transactional
  public void changePassword(UUID userId, ChangePasswordRequest request) {
    UserEntity user = findUserOrThrow(userId);

    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw new BadCredentialsException("Mật khẩu hiện tại không chính xác");
    }

    if (request.currentPassword().equals(request.newPassword())) {
      throw new IllegalArgumentException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
    }

    if (!PWD_PATTERN.matcher(request.newPassword()).matches()) {
      throw new IllegalArgumentException(
          "Mật khẩu mới phải từ 8 đến 128 ký tự, bao gồm ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt (@$!%*?&)");
    }

    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);

    if (refreshTokenRepository != null) {
      try {
        refreshTokenRepository.revokeAllByUserId(userId);
      } catch (Exception ignored) {
        // Safe token invalidation
      }
    }

    auditLogService.logAction(
        userId,
        "PASSWORD_CHANGED",
        "USER",
        userId.toString(),
        "Đổi mật khẩu tài khoản thành công và thu hồi các phiên đăng nhập cũ");
  }

  /**
   * Xóa mềm tài khoản người dùng (FR-AUTH-05 / BR-01).
   * Tuyệt đối không xóa cứng (userRepository.delete) để bảo vệ toàn vẹn lịch sử dữ liệu.
   * Ràng buộc: Không được xóa nếu user đang là OWNER của bất kỳ chuyến đi nào chưa hủy.
   */
  @Transactional
  public void deleteAccount(UUID userId) {
    UserEntity user = findUserOrThrow(userId);

    if (tripAccessService != null && tripAccessService.isOwnerOfAnyActiveTrip(userId)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Bạn đang là Trưởng nhóm của một hoặc nhiều chuyến đi đang hoạt động. "
              + "Vui lòng chuyển giao quyền Trưởng nhóm hoặc xóa chuyến đi trước khi xóa tài khoản.");
    }

    user.setStatus("DELETED");
    userRepository.save(user);

    if (refreshTokenRepository != null) {
      try {
        refreshTokenRepository.revokeAllByUserId(userId);
      } catch (Exception ignored) {
      }
    }

    auditLogService.logAction(
        userId,
        "ACCOUNT_DELETED",
        "USER",
        userId.toString(),
        "Xóa mềm tài khoản người dùng thành công");
  }

  /**
   * Vô hiệu hóa tài khoản (alias cho deleteAccount theo chuẩn SRS FR-AUTH-05).
   */
  @Transactional
  public void deactivateAccount(UUID userId) {
    deleteAccount(userId);
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

    List<String> prefs = Collections.emptyList();
    if (user.getTravelPreferences() != null && !user.getTravelPreferences().isBlank()) {
      try {
        prefs =
            objectMapper.readValue(
                user.getTravelPreferences(), new TypeReference<List<String>>() {});
      } catch (Exception ignored) {
        prefs = Collections.emptyList();
      }
    }

    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getAvatarUrl(),
        user.getStatus(),
        roles,
        user.getPhoneNumber(),
        user.getBio(),
        user.getBankCode(),
        user.getBankBin(),
        user.getBankAccountNumber(),
        user.getBankAccountName(),
        prefs);
  }
}
