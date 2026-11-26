package com.vista.collaboration.itinerary;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record TripItineraryResponse(UUID tripId, List<DayDto> days) {

  public record DayDto(
      UUID id, Integer dayNumber, LocalDate tripDate, Long version, List<ActivityDto> activities) {}

  public record ActivityDto(
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
