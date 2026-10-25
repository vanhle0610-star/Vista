package com.vista.collaboration.itinerary;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public record ItineraryItemResponse(
    UUID id,
    UUID dayId,
    UUID destinationId,
    String customStopName,
    LocalTime startTime,
    LocalTime endTime,
    Integer sortOrder,
    String note,
    String source,
    UUID updatedBy,
    Instant updatedAt,
    Long version) {
  public static ItineraryItemResponse from(ItineraryItem item) {
    return new ItineraryItemResponse(
        item.getId(),
        item.getDay() != null ? item.getDay().getId() : null,
        item.getDestinationId(),
        item.getCustomStopName(),
        item.getStartTime(),
        item.getEndTime(),
        item.getSortOrder(),
        item.getNote(),
        item.getSource(),
        item.getUpdatedBy(),
        item.getUpdatedAt(),
        item.getVersion());
  }
}
