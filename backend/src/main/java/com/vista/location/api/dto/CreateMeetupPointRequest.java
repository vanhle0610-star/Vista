package com.vista.location.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record CreateMeetupPointRequest(
    @NotBlank(message = "Label is required") @Size(max = 200, message = "Label must not exceed 200 characters") String label,
    @NotNull(message = "Latitude is required") @DecimalMin(value = "-90.0", message = "Latitude must be >= -90") @DecimalMax(value = "90.0", message = "Latitude must be <= 90") BigDecimal latitude,
    @NotNull(message = "Longitude is required") @DecimalMin(value = "-180.0", message = "Longitude must be >= -180") @DecimalMax(value = "180.0", message = "Longitude must be <= 180") BigDecimal longitude,
    Instant targetTime,
    String description) {}
