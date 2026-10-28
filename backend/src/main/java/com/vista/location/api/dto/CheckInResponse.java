package com.vista.location.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CheckInResponse(
    UUID id,
    UUID tripId,
    UUID itineraryItemId,
    UUID userId,
    String userDisplayName,
    String userAvatarUrl,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant checkedInAt) {}
