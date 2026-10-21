package com.vista.ai.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AiItinerarySuggestionResponse(
    String destinationProvince,
    Integer totalDays,
    String budgetLevel,
    BigDecimal estimatedTotalCost,
    Boolean isMockData,
    List<SuggestedDayResponse> days) {
  public record SuggestedDayResponse(
      Integer dayNumber, String dateLabel, List<SuggestedActivityResponse> activities) {}

  public record SuggestedActivityResponse(
      UUID destinationId,
      String timeSlot,
      String destinationName,
      BigDecimal estimatedCost,
      String category,
      String note) {}
}
