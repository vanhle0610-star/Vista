package com.vista.admin.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.admin.dto.AdminUserDetailDto;
import com.vista.admin.dto.AdminUserPageDto;
import com.vista.admin.dto.AdminUserStatsDto;
import com.vista.admin.dto.AdminUserSummaryDto;
import com.vista.auth.domain.RoleEntity;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.common.audit.AuditLogService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

  private static final Set<String> ALLOWED_ROLES = Set.of("USER", "MODERATOR", "ADMIN");
  private static final Pattern DIACRITICS_PATTERN =
      Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  public AdminUserService(
      UserRepository userRepository,
      RoleRepository roleRepository,
      RefreshTokenRepository refreshTokenRepository,
      AuditLogService auditLogService,
      ObjectMapper objectMapper) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public AdminUserStatsDto getUserStats() {
    List<UserEntity> allUsers = userRepository.findAll();
    Instant now = Instant.now();
    Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);
    Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);

    long totalUsers = allUsers.size();
    long activeUsers = allUsers.stream().filter(this::isActiveUser).count();
    long lockedUsers = totalUsers - activeUsers;
    long newUsersLast30Days =
        allUsers.stream()
            .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(thirtyDaysAgo))
            .count();
    long newUsersLast7Days =
        allUsers.stream()
            .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(sevenDaysAgo))
            .count();

    long adminCount = allUsers.stream().filter(u -> hasRole(u, "ADMIN")).count();
    long moderatorCount = allUsers.stream().filter(u -> hasRole(u, "MODERATOR")).count();
    long regularUserCount =
        allUsers.stream().filter(u -> !hasRole(u, "ADMIN") && !hasRole(u, "MODERATOR")).count();

    return new AdminUserStatsDto(
        totalUsers,
        activeUsers,
        lockedUsers,
        newUsersLast30Days,
        newUsersLast7Days,
        adminCount,
        moderatorCount,
        regularUserCount);
  }

  @Transactional(readOnly = true)
  public AdminUserPageDto searchUsers(
      String keyword, String role, String status, String sortDir, int page, int size) {
    int safePage = Math.max(0, page);
    int safeSize = Math.min(100, Math.max(1, size));

    String normalizedKeyword = normalizeForSearch(keyword);
    String normalizedRole =
        role != null && !role.isBlank() ? role.trim().toUpperCase(Locale.ROOT) : "ALL";
    String normalizedStatus =
        status != null && !status.isBlank() ? status.trim().toUpperCase(Locale.ROOT) : "ALL";
    boolean sortAsc = "asc".equalsIgnoreCase(sortDir != null ? sortDir.trim() : "desc");

    Comparator<UserEntity> comparator =
        Comparator.comparing(
            (UserEntity u) -> u.getCreatedAt() != null ? u.getCreatedAt() : Instant.EPOCH);
    if (!sortAsc) {
      comparator = comparator.reversed();
    }
    comparator =
        comparator.thenComparing(
            u -> u.getEmail() != null ? u.getEmail().toLowerCase(Locale.ROOT) : "");

    List<UserEntity> filtered =
        userRepository.findAll().stream()
            .filter(u -> matchesKeyword(u, normalizedKeyword))
            .filter(u -> matchesRole(u, normalizedRole))
            .filter(u -> matchesStatus(u, normalizedStatus))
            .sorted(comparator)
            .toList();

    long total = filtered.size();
    int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
    int fromIndex = Math.min(safePage * safeSize, filtered.size());
    int toIndex = Math.min(fromIndex + safeSize, filtered.size());

    List<AdminUserSummaryDto> items =
        filtered.subList(fromIndex, toIndex).stream().map(this::toSummaryDto).toList();

    return new AdminUserPageDto(items, safePage, safeSize, total, totalPages);
  }

  @Transactional(readOnly = true)
  public AdminUserDetailDto getUserDetail(UUID userId) {
    UserEntity user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
    return toDetailDto(user);
  }

  @Transactional
  public AdminUserDetailDto updateUserStatus(
      UUID targetUserId, String requestedStatus, String reason, UUID actorId) {
    if (requestedStatus == null || requestedStatus.isBlank()) {
      throw new IllegalArgumentException("Trạng thái tài khoản không được để trống");
    }

    String upperStatus = requestedStatus.trim().toUpperCase(Locale.ROOT);
    String targetStatus;
    if ("ACTIVE".equals(upperStatus)) {
      targetStatus = "ACTIVE";
    } else if ("LOCKED".equals(upperStatus)
        || "INACTIVE".equals(upperStatus)
        || "BANNED".equals(upperStatus)
        || "DISABLED".equals(upperStatus)) {
      targetStatus = "LOCKED";
    } else {
      throw new IllegalArgumentException(
          "Trạng thái không hợp lệ: "
              + requestedStatus
              + ". Chỉ chấp nhận ACTIVE hoặc LOCKED/INACTIVE.");
    }

    if (actorId != null && actorId.equals(targetUserId) && !"ACTIVE".equals(targetStatus)) {
      throw new IllegalArgumentException(
          "Quản trị viên không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình");
    }

    UserEntity user =
        userRepository
            .findById(targetUserId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Không tìm thấy người dùng với ID: " + targetUserId));

    if (!"ACTIVE".equals(targetStatus) && hasRole(user, "ADMIN")) {
      long otherActiveAdmins =
          userRepository.findAll().stream()
              .filter(u -> !u.getId().equals(targetUserId))
              .filter(this::isActiveUser)
              .filter(u -> hasRole(u, "ADMIN"))
              .count();
      if (otherActiveAdmins == 0) {
        throw new IllegalArgumentException(
            "Không thể khóa Quản trị viên (ADMIN) đang hoạt động cuối cùng của hệ thống");
      }
    }

    String previousStatus = normalizeStatusLabel(user.getStatus());
    user.setStatus(targetStatus);
    UserEntity saved = userRepository.save(user);

    if (!"ACTIVE".equals(targetStatus)) {
      refreshTokenRepository.revokeAllByUserId(targetUserId);
    }

    String cleanReason =
        reason != null && !reason.isBlank()
            ? reason.trim()
            : ("ACTIVE".equals(targetStatus)
                ? "Mở khóa tài khoản bởi Quản trị viên"
                : "Khóa tài khoản bởi Quản trị viên");
    String actionCode = "ACTIVE".equals(targetStatus) ? "ADMIN_USER_UNLOCKED" : "ADMIN_USER_LOCKED";
    String details =
        String.format(
            "{\"email\":\"%s\",\"previousStatus\":\"%s\",\"newStatus\":\"%s\",\"reason\":\"%s\"}",
            escapeJson(saved.getEmail()),
            escapeJson(previousStatus),
            escapeJson(targetStatus),
            escapeJson(cleanReason));

    auditLogService.logAction(actorId, actionCode, "USER", targetUserId.toString(), details);

    return toDetailDto(saved);
  }

  @Transactional
  public AdminUserDetailDto updateUserRoles(
      UUID targetUserId, List<String> requestedRoles, String reason, UUID actorId) {
    if (requestedRoles == null || requestedRoles.isEmpty()) {
      throw new IllegalArgumentException("Danh sách vai trò không được để trống");
    }

    Set<String> normalizedRoles = new LinkedHashSet<>();
    for (String r : requestedRoles) {
      if (r == null || r.isBlank()) {
        continue;
      }
      String code = r.trim().toUpperCase(Locale.ROOT);
      if (code.startsWith("ROLE_")) {
        code = code.substring(5);
      }
      if (!ALLOWED_ROLES.contains(code)) {
        throw new IllegalArgumentException(
            "Vai trò không hợp lệ: " + r + ". Chỉ hỗ trợ USER, MODERATOR, ADMIN.");
      }
      normalizedRoles.add(code);
    }

    if (normalizedRoles.isEmpty()) {
      throw new IllegalArgumentException("Phải chọn ít nhất một vai trò hợp lệ");
    }

    if (actorId != null && actorId.equals(targetUserId) && !normalizedRoles.contains("ADMIN")) {
      throw new IllegalArgumentException(
          "Quản trị viên không thể tự gỡ quyền ADMIN của chính mình");
    }

    UserEntity user =
        userRepository
            .findById(targetUserId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Không tìm thấy người dùng với ID: " + targetUserId));

    if (hasRole(user, "ADMIN") && !normalizedRoles.contains("ADMIN")) {
      long otherActiveAdmins =
          userRepository.findAll().stream()
              .filter(u -> !u.getId().equals(targetUserId))
              .filter(this::isActiveUser)
              .filter(u -> hasRole(u, "ADMIN"))
              .count();
      if (otherActiveAdmins == 0) {
        throw new IllegalArgumentException(
            "Hệ thống phải có ít nhất một Quản trị viên (ADMIN) đang hoạt động");
      }
    }

    List<String> previousRoles = extractSortedRoleCodes(user);

    Set<RoleEntity> newRoleEntities = new LinkedHashSet<>();
    for (String code : normalizedRoles) {
      RoleEntity roleEntity =
          roleRepository
              .findByCode(code)
              .orElseGet(() -> roleRepository.save(new RoleEntity(code)));
      newRoleEntities.add(roleEntity);
    }

    user.getRoles().clear();
    for (RoleEntity roleEntity : newRoleEntities) {
      user.addRole(roleEntity);
    }

    UserEntity saved = userRepository.save(user);
    List<String> updatedRoles = extractSortedRoleCodes(saved);

    String cleanReason =
        reason != null && !reason.isBlank()
            ? reason.trim()
            : "Cập nhật phân quyền bởi Quản trị viên";
    String details =
        String.format(
            "{\"email\":\"%s\",\"previousRoles\":\"%s\",\"newRoles\":\"%s\",\"reason\":\"%s\"}",
            escapeJson(saved.getEmail()),
            escapeJson(String.join(",", previousRoles)),
            escapeJson(String.join(",", updatedRoles)),
            escapeJson(cleanReason));

    auditLogService.logAction(
        actorId, "ADMIN_USER_ROLES_UPDATED", "USER", targetUserId.toString(), details);

    return toDetailDto(saved);
  }

  private boolean isActiveUser(UserEntity user) {
    return user.getStatus() == null || "ACTIVE".equalsIgnoreCase(user.getStatus().trim());
  }

  private String normalizeStatusLabel(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank() || "ACTIVE".equalsIgnoreCase(rawStatus.trim())) {
      return "ACTIVE";
    }
    return "LOCKED";
  }

  private boolean hasRole(UserEntity user, String roleCode) {
    if (user.getRoles() == null || user.getRoles().isEmpty()) {
      return "USER".equalsIgnoreCase(roleCode);
    }
    return user.getRoles().stream()
        .anyMatch(r -> r != null && roleCode.equalsIgnoreCase(r.getCode()));
  }

  private boolean matchesKeyword(UserEntity user, String normalizedKeyword) {
    if (normalizedKeyword == null || normalizedKeyword.isEmpty()) {
      return true;
    }
    String nameNorm = normalizeForSearch(user.getDisplayName());
    String emailNorm = normalizeForSearch(user.getEmail());
    String phoneNorm = normalizeForSearch(user.getPhoneNumber());
    return nameNorm.contains(normalizedKeyword)
        || emailNorm.contains(normalizedKeyword)
        || phoneNorm.contains(normalizedKeyword);
  }

  private boolean matchesRole(UserEntity user, String normalizedRole) {
    if (normalizedRole == null || "ALL".equals(normalizedRole)) {
      return true;
    }
    return hasRole(user, normalizedRole);
  }

  private boolean matchesStatus(UserEntity user, String normalizedStatus) {
    if (normalizedStatus == null || "ALL".equals(normalizedStatus)) {
      return true;
    }
    boolean active = isActiveUser(user);
    if ("ACTIVE".equals(normalizedStatus)) {
      return active;
    }
    if ("LOCKED".equals(normalizedStatus)
        || "INACTIVE".equals(normalizedStatus)
        || "BANNED".equals(normalizedStatus)) {
      return !active;
    }
    return true;
  }

  private String normalizeForSearch(String input) {
    if (input == null || input.isBlank()) {
      return "";
    }
    String decomposed = Normalizer.normalize(input.trim(), Normalizer.Form.NFD);
    String withoutDiacritics =
        DIACRITICS_PATTERN.matcher(decomposed).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    return withoutDiacritics.toLowerCase(Locale.ROOT);
  }

  private List<String> extractSortedRoleCodes(UserEntity user) {
    if (user.getRoles() == null || user.getRoles().isEmpty()) {
      return List.of("USER");
    }
    List<String> priorityOrder = List.of("ADMIN", "MODERATOR", "USER");
    return user.getRoles().stream()
        .filter(r -> r != null && r.getCode() != null)
        .map(r -> r.getCode().toUpperCase(Locale.ROOT))
        .distinct()
        .sorted(
            Comparator.comparingInt(
                code -> {
                  int idx = priorityOrder.indexOf(code);
                  return idx >= 0 ? idx : 99;
                }))
        .toList();
  }

  private List<String> parseTravelPreferences(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      List<String> parsed = objectMapper.readValue(json, new TypeReference<List<String>>() {});
      return parsed != null ? parsed : List.of();
    } catch (Exception e) {
      return new ArrayList<>();
    }
  }

  private AdminUserSummaryDto toSummaryDto(UserEntity user) {
    return new AdminUserSummaryDto(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getPhoneNumber(),
        user.getAvatarUrl(),
        normalizeStatusLabel(user.getStatus()),
        extractSortedRoleCodes(user),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }

  private AdminUserDetailDto toDetailDto(UserEntity user) {
    return new AdminUserDetailDto(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getPhoneNumber(),
        user.getAvatarUrl(),
        user.getBio(),
        normalizeStatusLabel(user.getStatus()),
        extractSortedRoleCodes(user),
        parseTravelPreferences(user.getTravelPreferences()),
        user.getBankCode(),
        user.getBankAccountNumber(),
        user.getBankAccountName(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }

  private String escapeJson(String value) {
    if (value == null) {
      return "";
    }
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
