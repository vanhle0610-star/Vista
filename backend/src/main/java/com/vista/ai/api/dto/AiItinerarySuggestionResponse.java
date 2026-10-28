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
    List<SuggestedDayResponse> days,
    String provider,
    Boolean fallbackUsed,
    List<CitationResponse> citations) {

  public AiItinerarySuggestionResponse(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      BigDecimal estimatedTotalCost,
      Boolean isMockData,
      List<SuggestedDayResponse> days,
      String provider,
      Boolean fallbackUsed) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        estimatedTotalCost,
        isMockData,
        days,
        provider,
        fallbackUsed,
        List.of());
  }

  public AiItinerarySuggestionResponse(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      BigDecimal estimatedTotalCost,
      Boolean isMockData,
      List<SuggestedDayResponse> days) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        estimatedTotalCost,
        isMockData,
        days,
        Boolean.TRUE.equals(isMockData) ? "deterministic" : "unknown",
        false,
        List.of());
  }

  public record SuggestedDayResponse(
      Integer dayNumber, String dateLabel, List<SuggestedActivityResponse> activities) {}

  public record SuggestedActivityResponse(
      UUID destinationId,
      String timeSlot,
      String destinationName,
      BigDecimal estimatedCost,
      String category,
      String note) {}

  public record CitationResponse(
      String sourceType,
      UUID sourceId,
      String title,
      UUID chunkId,
      String retrievalMethod,
      Double score) {}
}
