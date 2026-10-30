package com.vista.ai.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AiItinerarySuggestionRequest(
    @NotBlank(message = "destinationProvince is required") String destinationProvince,
    @NotNull(message = "totalDays is required") @Min(value = 1, message = "totalDays must be at least 1") @Max(value = 7, message = "totalDays must not exceed 7") Integer totalDays,
    @NotBlank(message = "budgetLevel is required") String budgetLevel,
    List<String> interests,
    String startDate,
    Integer peopleCount,
    String travelWith,
    String specialRequests,
    String arrivalTime,
    String departureTime,
    String pace,
    String travelMode,
    List<String> mustVisitPlaces,
    List<String> avoidPlaces) {

  public AiItinerarySuggestionRequest(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      List<String> interests,
      String startDate,
      Integer peopleCount,
      String travelWith,
      String specialRequests) {
    this(
        destinationProvince,
        totalDays,
        budgetLevel,
        interests,
        startDate,
        peopleCount,
        travelWith,
        specialRequests,
        null,
        null,
        "MODERATE",
        "DRIVING",
        List.of(),
        List.of());
  }

  public AiItinerarySuggestionRequest(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      List<String> interests,
      String startDate) {
    this(destinationProvince, totalDays, budgetLevel, interests, startDate, 2, "Nhóm bạn", null);
  }

  public AiItinerarySuggestionRequest(
      String destinationProvince,
      Integer totalDays,
      String budgetLevel,
      List<String> interests) {
    this(destinationProvince, totalDays, budgetLevel, interests, null, 2, "Nhóm bạn", null);
  }
}
