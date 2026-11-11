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
    List<CitationResponse> citations,
    String weatherSummary,
    String pacingSummary,
    String localAdviceSummary,
    String strategicRationale,
    String companionFitRationale,
    String budgetOptimizationRationale,
    BigDecimal totalSightseeingCost,
    BigDecimal totalDiningCost,
    BigDecimal totalTransitCost,
    Boolean isBudgetFeasible,
    Integer unverifiedCostCount) {

  public AiItinerarySuggestionResponse(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      BigDecimal estimatedTotalCost,
      Boolean isMockData,
      List<SuggestedDayResponse> days,
      String provider,
      Boolean fallbackUsed,
      List<CitationResponse> citations,
      String weatherSummary,
      String pacingSummary,
      String localAdviceSummary,
      String strategicRationale,
      String companionFitRationale,
      String budgetOptimizationRationale) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        estimatedTotalCost,
        isMockData,
        days,
        provider,
        fallbackUsed,
        citations,
        weatherSummary,
        pacingSummary,
        localAdviceSummary,
        strategicRationale,
        companionFitRationale,
        budgetOptimizationRationale,
        null,
        null,
        null,
        true,
        0);
  }

  public AiItinerarySuggestionResponse(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      BigDecimal estimatedTotalCost,
      Boolean isMockData,
      List<SuggestedDayResponse> days,
      String provider,
      Boolean fallbackUsed,
      List<CitationResponse> citations,
      String weatherSummary,
      String pacingSummary,
      String localAdviceSummary) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        estimatedTotalCost,
        isMockData,
        days,
        provider,
        fallbackUsed,
        citations,
        weatherSummary,
        pacingSummary,
        localAdviceSummary,
        null,
        null,
        null,
        null,
        null,
        null,
        true,
        0);
  }

  public AiItinerarySuggestionResponse(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      BigDecimal estimatedTotalCost,
      Boolean isMockData,
      List<SuggestedDayResponse> days,
      String provider,
      Boolean fallbackUsed,
      List<CitationResponse> citations) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        estimatedTotalCost,
        isMockData,
        days,
        provider,
        fallbackUsed,
        citations,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        true,
        0);
  }

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
        List.of(),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        true,
        0);
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
        List.of(),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        true,
        0);
  }

  public record SuggestedDayResponse(
      Integer dayNumber, String dateLabel, List<SuggestedActivityResponse> activities) {}

  public record SuggestedActivityResponse(
      UUID destinationId,
      String timeSlot,
      String destinationName,
      BigDecimal estimatedCost,
      String category,
      String note,
      String rationale,
      String timeSlotReason,
      String whyVisitReason,
      String startTime,
      String endTime,
      Integer visitDurationMinutes,
      Integer travelDurationFromPreviousMinutes,
      Integer bufferMinutes,
      String costStatus,
      String warning) {

    public SuggestedActivityResponse(
        UUID destinationId,
        String timeSlot,
        String destinationName,
        BigDecimal estimatedCost,
        String category,
        String note,
        String rationale,
        String timeSlotReason,
        String whyVisitReason) {
      this(
          destinationId,
          timeSlot,
          destinationName,
          estimatedCost,
          category,
          note,
          rationale,
          timeSlotReason,
          whyVisitReason,
          null,
          null,
          null,
          null,
          null,
          estimatedCost == null
              ? "UNVERIFIED"
              : (estimatedCost.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : "PAID"),
          null);
    }

    public SuggestedActivityResponse(
        UUID destinationId,
        String timeSlot,
        String destinationName,
        BigDecimal estimatedCost,
        String category,
        String note,
        String rationale) {
      this(
          destinationId,
          timeSlot,
          destinationName,
          estimatedCost,
          category,
          note,
          rationale,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          estimatedCost == null
              ? "UNVERIFIED"
              : (estimatedCost.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : "PAID"),
          null);
    }

    public SuggestedActivityResponse(
        UUID destinationId,
        String timeSlot,
        String destinationName,
        BigDecimal estimatedCost,
        String category,
        String note) {
      this(
          destinationId,
          timeSlot,
          destinationName,
          estimatedCost,
          category,
          note,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          estimatedCost == null
              ? "UNVERIFIED"
              : (estimatedCost.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : "PAID"),
          null);
    }
  }

  public record CitationResponse(
      String sourceType,
      UUID sourceId,
      String title,
      UUID chunkId,
      String retrievalMethod,
      Double score) {}
}
