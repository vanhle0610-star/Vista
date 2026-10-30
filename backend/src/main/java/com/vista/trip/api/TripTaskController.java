package com.vista.trip.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.trip.api.dto.CreateTaskRequest;
import com.vista.trip.api.dto.TaskResponse;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.application.TripTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/tasks")
@Tag(name = "Trip Tasks", description = "Quản lý nhiệm vụ phân công trong chuyến đi (NFR-02)")
@SecurityRequirement(name = "bearerAuth")
public class TripTaskController {

  private final TripTaskService tripTaskService;
  private final TripAccessService tripAccessService;
  private final CurrentUserProvider currentUserProvider;

  public TripTaskController(
      TripTaskService tripTaskService,
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider) {
    this.tripTaskService = tripTaskService;
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách nhiệm vụ của chuyến đi")
  public ResponseEntity<List<TaskResponse>> getTasks(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);
    return ResponseEntity.ok(tripTaskService.getTasksByTrip(tripId));
  }

  @PostMapping
  @Operation(summary = "Tạo nhiệm vụ mới (Chỉ dành cho Trưởng nhóm / Owner)")
  public ResponseEntity<TaskResponse> createTask(
      @PathVariable UUID tripId, @Valid @RequestBody CreateTaskRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireOwner(tripId, currentUserId);
    TaskResponse response = tripTaskService.createTask(tripId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @DeleteMapping("/{taskId}")
  @Operation(summary = "Xóa nhiệm vụ (Chỉ dành cho Trưởng nhóm / Owner)")
  public ResponseEntity<Void> deleteTask(
      @PathVariable UUID tripId, @PathVariable UUID taskId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireOwner(tripId, currentUserId);
    tripTaskService.deleteTask(tripId, taskId);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{taskId}/toggle")
  @Operation(summary = "Đánh dấu hoàn thành / chưa hoàn thành nhiệm vụ (Thành viên chuyến đi)")
  public ResponseEntity<TaskResponse> toggleTask(
      @PathVariable UUID tripId, @PathVariable UUID taskId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);
    return ResponseEntity.ok(tripTaskService.toggleTaskStatus(tripId, taskId));
  }
}

