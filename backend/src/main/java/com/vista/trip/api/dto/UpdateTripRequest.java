package com.vista.trip.api.dto;

import com.vista.trip.domain.TripStatus;
import com.vista.trip.domain.TripVisibility;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateTripRequest(
    @Size(max = 200, message = "Tên chuyến đi tối đa 200 ký tự") String title,
    LocalDate startDate,
    LocalDate endDate,
    String destinationSummary,
    BigDecimal budgetTotal,
    String currency,
    TripStatus status,
    TripVisibility visibility) {}
