package com.vista.trip.application;

import com.vista.trip.api.dto.CreateTaskRequest;
import com.vista.trip.api.dto.TaskResponse;
import com.vista.trip.domain.TripTaskEntity;
import com.vista.trip.domain.TripTaskRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class TripTaskService {

  private final TripTaskRepository tripTaskRepository;

  public TripTaskService(TripTaskRepository tripTaskRepository) {
    this.tripTaskRepository = tripTaskRepository;
  }

  @Transactional(readOnly = true)
  public List<TaskResponse> getTasksByTrip(UUID tripId) {
    return tripTaskRepository.findByTripIdOrderByCreatedAtAsc(tripId).stream()
        .map(TaskResponse::from)
        .toList();
  }

  public TaskResponse createTask(UUID tripId, CreateTaskRequest request) {
    TripTaskEntity entity =
        new TripTaskEntity(tripId, request.title().trim(), request.assigneeId());
    TripTaskEntity saved = tripTaskRepository.save(entity);
    return TaskResponse.from(saved);
  }

  public void deleteTask(UUID tripId, UUID taskId) {
    TripTaskEntity entity =
        tripTaskRepository
            .findByIdAndTripId(taskId, tripId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhiệm vụ"));
    tripTaskRepository.delete(entity);
  }

  public TaskResponse toggleTaskStatus(UUID tripId, UUID taskId) {
    TripTaskEntity entity =
        tripTaskRepository
            .findByIdAndTripId(taskId, tripId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhiệm vụ"));
    entity.setCompleted(!entity.isCompleted());
    TripTaskEntity saved = tripTaskRepository.save(entity);
    return TaskResponse.from(saved);
  }
}

