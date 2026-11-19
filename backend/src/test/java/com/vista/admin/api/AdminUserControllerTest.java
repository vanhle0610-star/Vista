package com.vista.admin.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.admin.application.AdminUserService;
import com.vista.admin.dto.AdminUserDetailDto;
import com.vista.admin.dto.AdminUserPageDto;
import com.vista.admin.dto.AdminUserStatsDto;
import com.vista.admin.dto.AdminUserSummaryDto;
import com.vista.admin.dto.UpdateUserRolesRequest;
import com.vista.admin.dto.UpdateUserStatusRequest;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import java.time.Instant;
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

@WebMvcTest(AdminUserController.class)
@Import({SecurityConfiguration.class, GlobalExceptionHandler.class})
@DisplayName("AdminUserController Security & REST API Tests")
class AdminUserControllerTest {

  @Autowired MockMvc mvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean AdminUserService adminUserService;
  @MockitoBean CurrentUserProvider currentUserProvider;

  private AdminUserDetailDto sampleDetailDto(UUID id, String status, List<String> roles) {
    return new AdminUserDetailDto(
        id,
        "hoang.nam@vista.vn",
        "Phạm Hoàng Nam",
        "0934567890",
        "https://example.com/avatar.jpg",
        "Du khách đam mê khám phá Tây Bắc",
        status,
        roles,
        List.of("Văn hóa", "Thiên nhiên"),
        "VCB",
        "0123456789",
        "PHAM HOANG NAM",
        Instant.parse("2026-10-01T08:00:00Z"),
        Instant.parse("2026-10-15T10:30:00Z"));
  }

  @Test
  @DisplayName("Unauthenticated request to /api/v1/admin/users returns 401 Unauthorized")
  void unauthenticatedRequestReturns401() throws Exception {
    mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("Regular USER role to /api/v1/admin/users returns 403 Forbidden")
  void regularUserRoleReturns403() throws Exception {
    mvc.perform(get("/api/v1/admin/users")).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/admin/users/stats")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("MODERATOR role to /api/v1/admin/users returns 403 Forbidden (strictly ADMIN only)")
  void moderatorRoleReturns403() throws Exception {
    mvc.perform(get("/api/v1/admin/users")).andExpect(status().isForbidden());
    mvc.perform(
            put("/api/v1/admin/users/{id}/lock", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Spam\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("ADMIN role GET /api/v1/admin/users/stats returns 200 and accurate KPI counters")
  void getStatsAsAdminReturns200() throws Exception {
    when(adminUserService.getUserStats())
        .thenReturn(new AdminUserStatsDto(120, 112, 8, 24, 7, 2, 5, 113));

    mvc.perform(get("/api/v1/admin/users/stats"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalUsers").value(120))
        .andExpect(jsonPath("$.activeUsers").value(112))
        .andExpect(jsonPath("$.lockedUsers").value(8))
        .andExpect(jsonPath("$.newUsersLast30Days").value(24));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("ADMIN role GET /api/v1/admin/users returns paginated list without passwordHash")
  void listUsersAsAdminReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    AdminUserSummaryDto item =
        new AdminUserSummaryDto(
            id,
            "hoang.nam@vista.vn",
            "Phạm Hoàng Nam",
            "0934567890",
            null,
            "ACTIVE",
            List.of("USER"),
            Instant.now(),
            Instant.now());
    when(adminUserService.searchUsers(
            nullable(String.class), anyString(), anyString(), anyString(), anyInt(), anyInt()))
        .thenReturn(new AdminUserPageDto(List.of(item), 0, 10, 1L, 1));

    mvc.perform(
            get("/api/v1/admin/users")
                .param("keyword", "nam")
                .param("role", "USER")
                .param("status", "ACTIVE")
                .param("sortDir", "desc")
                .param("page", "0")
                .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].email").value("hoang.nam@vista.vn"))
        .andExpect(jsonPath("$.items[0].displayName").value("Phạm Hoàng Nam"))
        .andExpect(content().string(not(containsString("passwordHash"))));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("ADMIN role GET /api/v1/admin/users/{id} returns detail or 404 when missing")
  void getUserDetailAsAdminReturns200Or404() throws Exception {
    UUID id = UUID.randomUUID();
    when(adminUserService.getUserDetail(id))
        .thenReturn(sampleDetailDto(id, "ACTIVE", List.of("USER")));

    mvc.perform(get("/api/v1/admin/users/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()))
        .andExpect(jsonPath("$.email").value("hoang.nam@vista.vn"))
        .andExpect(content().string(not(containsString("passwordHash"))));

    UUID missingId = UUID.randomUUID();
    when(adminUserService.getUserDetail(missingId))
        .thenThrow(new ResourceNotFoundException("Không tìm thấy người dùng"));

    mvc.perform(get("/api/v1/admin/users/{id}", missingId)).andExpect(status().isNotFound());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("ADMIN role PUT /api/v1/admin/users/{id}/status locks and unlocks account")
  void updateUserStatusAsAdminReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    when(adminUserService.updateUserStatus(
            eq(id), eq("LOCKED"), nullable(String.class), nullable(UUID.class)))
        .thenReturn(sampleDetailDto(id, "LOCKED", List.of("USER")));

    UpdateUserStatusRequest req =
        new UpdateUserStatusRequest("LOCKED", "Vi phạm tiêu chuẩn cộng đồng");

    mvc.perform(
            put("/api/v1/admin/users/{id}/status", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LOCKED"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Self-lock attempt returns 400 Bad Request ProblemDetail")
  void selfLockAttemptReturns400() throws Exception {
    UUID adminId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(adminId);
    when(adminUserService.updateUserStatus(
            eq(adminId), eq("LOCKED"), nullable(String.class), eq(adminId)))
        .thenThrow(
            new IllegalArgumentException(
                "Quản trị viên không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình"));

    UpdateUserStatusRequest req = new UpdateUserStatusRequest("LOCKED", "Thử tự khóa");

    mvc.perform(
            put("/api/v1/admin/users/{id}/status", adminId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(containsString("tự khóa")));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("ADMIN role PUT /api/v1/admin/users/{id}/roles updates user roles")
  void updateUserRolesAsAdminReturns200() throws Exception {
    UUID id = UUID.randomUUID();
    when(adminUserService.updateUserRoles(
            eq(id), anyList(), nullable(String.class), nullable(UUID.class)))
        .thenReturn(sampleDetailDto(id, "ACTIVE", List.of("MODERATOR", "USER")));

    UpdateUserRolesRequest req =
        new UpdateUserRolesRequest(List.of("MODERATOR", "USER"), null, "Cấp quyền kiểm duyệt viên");

    mvc.perform(
            put("/api/v1/admin/users/{id}/roles", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles[0]").value("MODERATOR"))
        .andExpect(jsonPath("$.roles[1]").value("USER"));
  }
}
