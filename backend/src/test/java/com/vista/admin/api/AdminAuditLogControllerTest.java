package com.vista.admin.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vista.common.audit.domain.AuditLogEntity;
import com.vista.common.audit.infrastructure.AuditLogRepository;
import com.vista.common.security.SecurityConfiguration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminAuditLogController.class)
@Import(SecurityConfiguration.class)
@DisplayName("W6-TV1-03: AdminAuditLogController RBAC & Pagination Tests")
class AdminAuditLogControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private AuditLogRepository auditLogRepository;

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("GET /api/v1/admin/audit-logs returns 200 for ADMIN role")
  void listAuditLogs_asAdmin_returns200() throws Exception {
    UUID actorId = UUID.randomUUID();
    UUID entityId = UUID.randomUUID();
    AuditLogEntity entity =
        new AuditLogEntity(
            actorId,
            "APPROVE_DESTINATION",
            "DESTINATION",
            entityId,
            "{\"details\":\"Phê duyệt điểm đến Cầu Vàng\"}");

    when(auditLogRepository.findAllByOrderByCreatedAtDesc(any()))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1));

    mockMvc
        .perform(get("/api/v1/admin/audit-logs?page=0&size=20"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].action").value("APPROVE_DESTINATION"))
        .andExpect(jsonPath("$.items[0].entityType").value("DESTINATION"))
        .andExpect(jsonPath("$.items[0].actorId").value(actorId.toString()));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("GET /api/v1/admin/audit-logs filters by entityType for ADMIN")
  void listAuditLogs_filterByEntityType_returns200() throws Exception {
    UUID actorId = UUID.randomUUID();
    UUID postId = UUID.randomUUID();
    AuditLogEntity entity =
        new AuditLogEntity(
            actorId, "MODERATE_HIDE_POST", "POST", postId, "{\"details\":\"Ẩn bài viết spam\"}");

    when(auditLogRepository.findByEntityTypeIgnoreCaseOrderByCreatedAtDesc(eq("POST"), any()))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1));

    mockMvc
        .perform(get("/api/v1/admin/audit-logs?entityType=POST"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].action").value("MODERATE_HIDE_POST"))
        .andExpect(jsonPath("$.items[0].entityType").value("POST"));
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("GET /api/v1/admin/audit-logs returns 403 Forbidden for MODERATOR role")
  void listAuditLogs_asModerator_returns403() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit-logs")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("GET /api/v1/admin/audit-logs returns 403 Forbidden for USER role")
  void listAuditLogs_asUser_returns403() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit-logs")).andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("GET /api/v1/admin/audit-logs returns 401 Unauthorized when unauthenticated")
  void listAuditLogs_unauthenticated_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/admin/audit-logs")).andExpect(status().isUnauthorized());
  }
}
