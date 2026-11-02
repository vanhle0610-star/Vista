package com.vista.trip.api.dto;

import com.vista.trip.domain.TripTaskEntity;
import java.time.Instant;
import java.util.UUID;

public record TaskResponse(
    UUID id,
    UUID tripId,
    String title,
    UUID assigneeId,
    boolean isCompleted,
    Instant createdAt
) {
  public static TaskResponse from(TripTaskEntity entity) {
    return new TaskResponse(
        entity.getId(),
        entity.getTripId(),
        entity.getTitle(),
        entity.getAssigneeId(),
        entity.isCompleted(),
        entity.getCreatedAt()
    );
  }
}

