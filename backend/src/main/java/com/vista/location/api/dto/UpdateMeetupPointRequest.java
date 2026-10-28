package com.vista.location.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record UpdateMeetupPointRequest(
    @Size(min = 1, max = 200, message = "Label must be between 1 and 200 characters") String label,
    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90") @DecimalMax(value = "90.0", message = "Latitude must be <= 90") BigDecimal latitude,
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180") @DecimalMax(value = "180.0", message = "Longitude must be <= 180") BigDecimal longitude,
    Instant targetTime,
    String description) {}
