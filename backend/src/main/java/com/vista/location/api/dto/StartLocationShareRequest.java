package com.vista.location.api.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record StartLocationShareRequest(
    @NotNull(message = "Consent is required") @AssertTrue(message = "Consent must be explicitly true to opt-in") Boolean consent,
    @NotNull(message = "Expiry timestamp is required") @Future(message = "Expiry must be in the future") Instant expiresAt,
    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90") @DecimalMax(value = "90.0", message = "Latitude must be <= 90") BigDecimal latitude,
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180") @DecimalMax(value = "180.0", message = "Longitude must be <= 180") BigDecimal longitude) {}
