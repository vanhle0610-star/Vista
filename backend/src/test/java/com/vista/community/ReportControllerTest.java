package com.vista.community;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.community.api.ReportController;
import com.vista.community.api.dto.CreateReportRequest;
import com.vista.community.api.dto.HandleReportRequest;
import com.vista.community.api.dto.ReportResponse;
import com.vista.community.application.ReportService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ReportController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class ReportControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private ReportService reportService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final UUID userId = UUID.randomUUID();
  private final UUID postId = UUID.randomUUID();
  private final UUID reportId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  @WithMockUser
  @DisplayName("POST /api/v1/posts/{postId}/reports creates report and returns 201")
  void reportPost_valid_returns201() throws Exception {
    when(reportService.createReport(eq(userId), eq(postId), any(CreateReportRequest.class)))
        .thenReturn(reportId);

    var req = new CreateReportRequest("POST", "Spam hoặc quảng cáo không liên quan");

    mockMvc
        .perform(
            post("/api/v1/posts/{postId}/reports", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.reportId").value(reportId.toString()))
        .andExpect(jsonPath("$.status").value("OPEN"))
        .andExpect(jsonPath("$.message").exists());
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("GET /api/v1/admin/reports returns 200 for moderator")
  void listReports_asModerator_returns200() throws Exception {
    var response =
        new ReportResponse(
            reportId,
            userId,
            "Nguyen Van A",
            "POST",
            postId,
            "Cầu Vàng Bà Nà",
            List.of(),
            "Nguyen Hai Dang",
            1L,
            "Spam hoặc quảng cáo không liên quan",
            "OPEN",
            null,
            null,
            Instant.now());

    when(reportService.listReports("OPEN", 0, 20)).thenReturn(List.of(response));

    mockMvc
        .perform(get("/api/v1/admin/reports?status=OPEN&page=0&size=20"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reportId.toString()))
        .andExpect(jsonPath("$[0].targetId").value(postId.toString()))
        .andExpect(jsonPath("$[0].status").value("OPEN"));
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("GET /api/v1/admin/reports returns 403 for regular user")
  void listReports_asRegularUser_returns403() throws Exception {
    mockMvc.perform(get("/api/v1/admin/reports")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("PATCH /api/v1/admin/reports/{reportId} handles report and returns 200")
  void handleReport_asModerator_returns200() throws Exception {
    var handleReq = new HandleReportRequest("HIDE", "Vi phạm tiêu chuẩn cộng đồng");
    var response =
        new ReportResponse(
            reportId,
            userId,
            "Nguyen Van A",
            "POST",
            postId,
            "Cầu Vàng Bà Nà",
            List.of(),
            "Nguyen Hai Dang",
            1L,
            "Spam",
            "RESOLVED",
            userId,
            Instant.now(),
            Instant.now());

    when(reportService.handleReport(eq(userId), eq(reportId), any(HandleReportRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/admin/reports/{reportId}", reportId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(handleReq)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("RESOLVED"));
  }

  @Test
  @WithMockUser(roles = "MODERATOR")
  @DisplayName("POST /api/v1/admin/posts/{postId}/restore restores post and returns 200")
  void restorePost_asModerator_returns200() throws Exception {
    mockMvc
        .perform(post("/api/v1/admin/posts/{postId}/restore", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.postId").value(postId.toString()))
        .andExpect(jsonPath("$.status").value("VISIBLE"));

    verify(reportService).restorePost(userId, postId);
  }
}
