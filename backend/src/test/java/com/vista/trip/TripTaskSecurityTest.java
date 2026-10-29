package com.vista.trip;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.trip.api.TripTaskController;
import com.vista.trip.api.dto.CreateTaskRequest;
import com.vista.trip.api.dto.TaskResponse;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.application.TripTaskService;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {TripTaskController.class})
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class TripTaskSecurityTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private TripTaskService tripTaskService;
  @MockitoBean private TripAccessService tripAccessService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID tripId;
  private UUID actorId;
  private UUID taskId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    actorId = UUID.randomUUID();
    taskId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(actorId);
  }

  @Test
  @WithMockUser
  @DisplayName("Member can list trip tasks")
  void memberCanListTasks() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, actorId);
    when(tripTaskService.getTasksByTrip(tripId))
        .thenReturn(
            List.of(
                new TaskResponse(taskId, tripId, "Chuẩn bị lều trại", actorId, false, Instant.now())));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/tasks", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("Chuẩn bị lều trại"));

    verify(tripAccessService).requireMember(tripId, actorId);
  }

  @Test
  @WithMockUser
  @DisplayName("Non-member cannot list tasks (403 Forbidden)")
  void nonMemberCannotListTasks() throws Exception {
    doThrow(new AccessDeniedException("Chỉ thành viên mới có quyền xem"))
        .when(tripAccessService)
        .requireMember(tripId, actorId);

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/tasks", tripId))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser
  @DisplayName("Owner can create tasks")
  void ownerCanCreateTask() throws Exception {
    doNothing().when(tripAccessService).requireOwner(tripId, actorId);
    var request = new CreateTaskRequest("Mua vé máy bay", actorId);
    when(tripTaskService.createTask(eq(tripId), any(CreateTaskRequest.class)))
        .thenReturn(new TaskResponse(taskId, tripId, "Mua vé máy bay", actorId, false, Instant.now()));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/tasks", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Mua vé máy bay"));

    verify(tripAccessService).requireOwner(tripId, actorId);
  }

  @Test
  @WithMockUser
  @DisplayName("Non-owner cannot create task (403 Forbidden)")
  void nonOwnerCannotCreateTask() throws Exception {
    doThrow(new AccessDeniedException("Chỉ Trưởng nhóm mới có quyền tạo nhiệm vụ"))
        .when(tripAccessService)
        .requireOwner(tripId, actorId);
    var request = new CreateTaskRequest("Mua vé máy bay", actorId);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/tasks", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser
  @DisplayName("Owner can delete task")
  void ownerCanDeleteTask() throws Exception {
    doNothing().when(tripAccessService).requireOwner(tripId, actorId);
    doNothing().when(tripTaskService).deleteTask(tripId, taskId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/tasks/{taskId}", tripId, taskId))
        .andExpect(status().isNoContent());

    verify(tripAccessService).requireOwner(tripId, actorId);
  }

  @Test
  @WithMockUser
  @DisplayName("Non-owner cannot delete task (403 Forbidden)")
  void nonOwnerCannotDeleteTask() throws Exception {
    doThrow(new AccessDeniedException("Chỉ Trưởng nhóm mới có quyền xóa nhiệm vụ"))
        .when(tripAccessService)
        .requireOwner(tripId, actorId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/tasks/{taskId}", tripId, taskId))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser
  @DisplayName("Member can toggle task completion status")
  void memberCanToggleTask() throws Exception {
    doNothing().when(tripAccessService).requireMember(tripId, actorId);
    when(tripTaskService.toggleTaskStatus(tripId, taskId))
        .thenReturn(new TaskResponse(taskId, tripId, "Chuẩn bị lều trại", actorId, true, Instant.now()));

    mockMvc
        .perform(patch("/api/v1/trips/{tripId}/tasks/{taskId}/toggle", tripId, taskId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isCompleted").value(true));

    verify(tripAccessService).requireMember(tripId, actorId);
  }
}

