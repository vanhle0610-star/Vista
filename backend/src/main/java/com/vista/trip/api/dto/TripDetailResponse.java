package com.vista.trip.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TripDetailResponse(
    UUID id,
    String title,
    LocalDate startDate,
    LocalDate endDate,
    String destinationSummary,
    BigDecimal budgetTotal,
    String currency,
    String status,
    UUID ownerId) {}
