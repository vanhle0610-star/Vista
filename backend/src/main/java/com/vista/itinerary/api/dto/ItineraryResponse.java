package com.vista.itinerary.api.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record ItineraryResponse(UUID tripId, List<ItineraryDayResponse> days) {
  public record ItineraryDayResponse(
      UUID id,
      Integer dayNumber,
      LocalDate tripDate,
      Long version,
      List<ItineraryItemResponse> activities) {}

  public record ItineraryItemResponse(
      UUID id,
      UUID destinationId,
      String destinationName,
      String customStopName,
      LocalTime startTime,
      LocalTime endTime,
      Integer sortOrder,
      String note,
      String source,
      Long version) {}
}

