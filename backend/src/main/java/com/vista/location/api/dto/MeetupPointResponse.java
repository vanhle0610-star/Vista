package com.vista.location.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record MeetupPointResponse(
    UUID id,
    UUID tripId,
    UUID createdBy,
    String creatorName,
    String label,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant targetTime,
    String description,
    Instant createdAt,
    Instant updatedAt) {}
