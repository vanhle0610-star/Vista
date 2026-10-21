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
    List<String> interests) {}
