package com.vista.location.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LocationShareResponse(
    UUID id,
    UUID tripId,
    UUID userId,
    String displayName,
    String avatarUrl,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant startedAt,
    Instant expiresAt,
    Instant lastUpdatedAt,
    boolean enabled,
    UUID sessionId) {

  public LocationShareResponse(
      UUID id,
      UUID tripId,
      UUID userId,
      String displayName,
      String avatarUrl,
      BigDecimal latitude,
      BigDecimal longitude,
      Instant startedAt,
      Instant expiresAt,
      Instant lastUpdatedAt,
      boolean enabled) {
    this(
        id,
        tripId,
        userId,
        displayName,
        avatarUrl,
        latitude,
        longitude,
        startedAt,
        expiresAt,
        lastUpdatedAt,
        enabled,
        null);
  }
}
