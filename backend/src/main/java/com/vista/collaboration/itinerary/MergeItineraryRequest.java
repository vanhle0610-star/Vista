package com.vista.collaboration.itinerary;

import java.util.List;
import java.util.UUID;

public record MergeItineraryRequest(List<MergeDay> days) {

  public record MergeDay(Integer dayNumber, List<MergeActivity> activities) {}

  public record MergeActivity(
      UUID destinationId,
      String customStopName,
      String startTime,
      String endTime,
      Integer sortOrder,
      String note,
      String source) {}
}
