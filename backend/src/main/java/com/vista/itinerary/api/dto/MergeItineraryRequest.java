package com.vista.itinerary.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record MergeItineraryRequest(
    @NotEmpty @Size(max = 14) List<@Valid ItineraryDayRequest> days) {

  public record ItineraryDayRequest(
      @NotNull @Min(1) @Max(14) Integer dayNumber,
      @NotEmpty @Size(max = 20) List<@Valid ItineraryItemRequest> activities) {}

  public record ItineraryItemRequest(
      UUID destinationId,
      @Size(max = 200) String customStopName,
      LocalTime startTime,
      LocalTime endTime,
      @NotNull @Min(0) @Max(100) Integer sortOrder,
      @Size(max = 2000) String note,
      @Size(max = 30) String source) {

    public ItineraryItemRequest {
      if (destinationId == null && (customStopName == null || customStopName.isBlank())) {
        throw new IllegalArgumentException("destinationId or customStopName is required");
      }
      if (startTime != null && endTime != null && endTime.isBefore(startTime)) {
        throw new IllegalArgumentException("endTime must not be before startTime");
      }
    }
  }
}

