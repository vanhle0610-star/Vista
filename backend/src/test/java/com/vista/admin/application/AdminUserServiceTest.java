package com.vista.admin.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.admin.dto.AdminUserDetailDto;
import com.vista.admin.dto.AdminUserPageDto;
import com.vista.admin.dto.AdminUserStatsDto;
import com.vista.auth.domain.RoleEntity;
import com.vista.auth.infrastructure.RefreshTokenRepository;
import com.vista.auth.infrastructure.RoleRepository;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.common.audit.AuditLogService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminUserService Unit Tests")
class AdminUserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private RoleRepository roleRepository;
  @Mock private RefreshTokenRepository refreshTokenRepository;
  @Mock private AuditLogService auditLogService;

  private AdminUserService adminUserService;

  private RoleEntity adminRole;
  private RoleEntity moderatorRole;
  private RoleEntity userRole;

  @BeforeEach
  void setUp() {
    adminUserService =
        new AdminUserService(
            userRepository,
            roleRepository,
            refreshTokenRepository,
            auditLogService,
            new ObjectMapper());
    adminRole = new RoleEntity("ADMIN");
    moderatorRole = new RoleEntity("MODERATOR");
    userRole = new RoleEntity("USER");
  }

  private UserEntity createUser(
      UUID id,
      String email,
      String displayName,
      String status,
      Instant createdAt,
      RoleEntity... roles) {
    UserEntity u = new UserEntity(email, "secret-bcrypt-hash", displayName);
    u.setPhoneNumber("0901234567");
    u.setStatus(status);
    u.setBio("Du khách yêu thích khám phá Việt Nam");
    u.setTravelPreferences("[\"Văn hóa\",\"Ẩm thực\"]");
    for (RoleEntity r : roles) {
      u.addRole(r);
    }
    try {
      Field idField = UserEntity.class.getDeclaredField("id");
      idField.setAccessible(true);
      idField.set(u, id);
      Field createdAtField = UserEntity.class.getDeclaredField("createdAt");
      createdAtField.setAccessible(true);
      createdAtField.set(u, createdAt);
      Field updatedAtField = UserEntity.class.getDeclaredField("updatedAt");
      updatedAtField.setAccessible(true);
      updatedAtField.set(u, createdAt);
    } catch (Exception ignored) {
    }
    return u;
  }

  @Test
  @DisplayName("getUserStats computes accurate total, active, locked, new users, and role counts")
  void getUserStatsComputesAccurateCounts() {
    Instant now = Instant.now();
    UserEntity u1 =
        createUser(
            UUID.randomUUID(),
            "admin@vista.vn",
            "Admin Một",
            "ACTIVE",
            now.minus(60, ChronoUnit.DAYS),
            adminRole,
            userRole);
    UserEntity u2 =
        createUser(
            UUID.randomUUID(),
            "mod@vista.vn",
            "Kiểm Duyệt Hai",
            "ACTIVE",
            now.minus(15, ChronoUnit.DAYS),
            moderatorRole);
    UserEntity u3 =
        createUser(
            UUID.randomUUID(),
            "user@vista.vn",
            "Người Dùng Ba",
            "ACTIVE",
            now.minus(2, ChronoUnit.DAYS),
            userRole);
    UserEntity u4 =
        createUser(
            UUID.randomUUID(),
            "locked@vista.vn",
            "Tài Khoản Khóa",
            "LOCKED",
            now.minus(5, ChronoUnit.DAYS),
            userRole);

    when(userRepository.findAll()).thenReturn(List.of(u1, u2, u3, u4));

    AdminUserStatsDto stats = adminUserService.getUserStats();

    assertThat(stats.totalUsers()).isEqualTo(4);
    assertThat(stats.activeUsers()).isEqualTo(3);
    assertThat(stats.lockedUsers()).isEqualTo(1);
    assertThat(stats.newUsersLast30Days()).isEqualTo(3);
    assertThat(stats.newUsersLast7Days()).isEqualTo(2);
    assertThat(stats.adminCount()).isEqualTo(1);
    assertThat(stats.moderatorCount()).isEqualTo(1);
    assertThat(stats.regularUserCount()).isEqualTo(2);
  }

  @Test
  @DisplayName("searchUsers supports Vietnamese unaccented search, role/status filter, and sortDir")
  void searchUsersFiltersAndSortsProperly() {
    Instant now = Instant.now();
    UserEntity u1 =
        createUser(
            UUID.randomUUID(),
            "admin@vista.vn",
            "Nguyễn Minh Quản Trị",
            "ACTIVE",
            now.minus(10, ChronoUnit.DAYS),
            adminRole);
    UserEntity u2 =
        createUser(
            UUID.randomUUID(),
            "khang@vista.vn",
            "Đặng Minh Khang",
            "LOCKED",
            now.minus(1, ChronoUnit.DAYS),
            userRole);

    when(userRepository.findAll()).thenReturn(List.of(u1, u2));

    // Unaccented search for "nguyen minh"
    AdminUserPageDto searchByName =
        adminUserService.searchUsers("nguyen minh", "ALL", "ALL", "desc", 0, 10);
    assertThat(searchByName.total()).isEqualTo(1);
    assertThat(searchByName.items().get(0).email()).isEqualTo("admin@vista.vn");

    // Filter by status LOCKED
    AdminUserPageDto lockedOnly =
        adminUserService.searchUsers(null, "ALL", "LOCKED", "desc", 0, 10);
    assertThat(lockedOnly.total()).isEqualTo(1);
    assertThat(lockedOnly.items().get(0).email()).isEqualTo("khang@vista.vn");

    // Sort asc vs desc
    AdminUserPageDto sortedAsc = adminUserService.searchUsers(null, "ALL", "ALL", "asc", 0, 10);
    assertThat(sortedAsc.items())
        .extracting("email")
        .containsExactly("admin@vista.vn", "khang@vista.vn");
  }

  @Test
  @DisplayName(
      "getUserDetail returns profile details and throws ResourceNotFoundException when missing")
  void getUserDetailReturnsProfileOrThrows404() {
    UUID userId = UUID.randomUUID();
    UserEntity user =
        createUser(userId, "nam@vista.vn", "Phạm Hoàng Nam", "ACTIVE", Instant.now(), userRole);
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    AdminUserDetailDto detail = adminUserService.getUserDetail(userId);
    assertThat(detail.id()).isEqualTo(userId);
    assertThat(detail.displayName()).isEqualTo("Phạm Hoàng Nam");
    assertThat(detail.roles()).containsExactly("USER");
    assertThat(detail.travelPreferences()).containsExactly("Văn hóa", "Ẩm thực");

    UUID unknownId = UUID.randomUUID();
    when(userRepository.findById(unknownId)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> adminUserService.getUserDetail(unknownId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("updateUserStatus locks user, revokes refresh tokens, and records audit log")
  void updateUserStatusLocksAndRevokesTokens() {
    UUID adminId = UUID.randomUUID();
    UUID targetUserId = UUID.randomUUID();
    UserEntity targetUser =
        createUser(
            targetUserId, "target@vista.vn", "Target User", "ACTIVE", Instant.now(), userRole);

    when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
    when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    AdminUserDetailDto updated =
        adminUserService.updateUserStatus(targetUserId, "LOCKED", "Vi phạm nội quy", adminId);

    assertThat(updated.status()).isEqualTo("LOCKED");
    verify(refreshTokenRepository).revokeAllByUserId(targetUserId);
    verify(auditLogService)
        .logAction(
            eq(adminId),
            eq("ADMIN_USER_LOCKED"),
            eq("USER"),
            eq(targetUserId.toString()),
            anyString());
  }

  @Test
  @DisplayName("updateUserStatus prevents ADMIN from locking their own account")
  void updateUserStatusPreventsSelfLock() {
    UUID adminId = UUID.randomUUID();

    assertThatThrownBy(
            () -> adminUserService.updateUserStatus(adminId, "LOCKED", "Tự khóa", adminId))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("tự khóa");

    verify(userRepository, never()).save(any());
    verify(refreshTokenRepository, never()).revokeAllByUserId(any());
  }

  @Test
  @DisplayName("updateUserRoles updates roles and prevents ADMIN from demoting themselves")
  void updateUserRolesUpdatesAndPreventsSelfDemotion() {
    UUID adminId = UUID.randomUUID();
    UUID targetUserId = UUID.randomUUID();
    UserEntity targetUser =
        createUser(
            targetUserId, "member@vista.vn", "Thành Viên", "ACTIVE", Instant.now(), userRole);

    when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
    when(roleRepository.findByCode("MODERATOR")).thenReturn(Optional.of(moderatorRole));
    when(roleRepository.findByCode("USER")).thenReturn(Optional.of(userRole));
    when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    AdminUserDetailDto updated =
        adminUserService.updateUserRoles(
            targetUserId, List.of("MODERATOR", "USER"), "Bổ nhiệm kiểm duyệt viên", adminId);

    assertThat(updated.roles()).containsExactly("MODERATOR", "USER");
    verify(auditLogService)
        .logAction(
            eq(adminId),
            eq("ADMIN_USER_ROLES_UPDATED"),
            eq("USER"),
            eq(targetUserId.toString()),
            anyString());

    // Self-demotion attempt
    assertThatThrownBy(
            () ->
                adminUserService.updateUserRoles(adminId, List.of("USER"), "Tự hạ quyền", adminId))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("tự gỡ quyền ADMIN");
  }
}
