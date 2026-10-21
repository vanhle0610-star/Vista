package com.vista.collaboration.itinerary;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ItineraryDayResponse(
    UUID id,
    UUID tripId,
    Integer dayNumber,
    LocalDate tripDate,
    List<ItineraryItemResponse> items,
    Instant createdAt,
    Instant updatedAt
) {
  public static ItineraryDayResponse from(ItineraryDay day) {
    List<ItineraryItemResponse> itemResponses = day.getItems().stream()
        .map(ItineraryItemResponse::from)
        .toList();
    return new ItineraryDayResponse(
        day.getId(),
        day.getTripId(),
        day.getDayNumber(),
        day.getTripDate(),
        itemResponses,
        day.getCreatedAt(),
        day.getUpdatedAt());
  }
}
