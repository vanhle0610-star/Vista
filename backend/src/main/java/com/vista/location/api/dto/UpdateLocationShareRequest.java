package com.vista.location.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record UpdateLocationShareRequest(
    Instant sessionStartedAt,
    UUID sessionId,
    @NotNull(message = "Latitude is required") @DecimalMin(value = "-90.0", message = "Latitude must be >= -90") @DecimalMax(value = "90.0", message = "Latitude must be <= 90") BigDecimal latitude,
    @NotNull(message = "Longitude is required") @DecimalMin(value = "-180.0", message = "Longitude must be >= -180") @DecimalMax(value = "180.0", message = "Longitude must be <= 180") BigDecimal longitude) {

  public UpdateLocationShareRequest(
      Instant sessionStartedAt, BigDecimal latitude, BigDecimal longitude) {
    this(sessionStartedAt, null, latitude, longitude);
  }
}
