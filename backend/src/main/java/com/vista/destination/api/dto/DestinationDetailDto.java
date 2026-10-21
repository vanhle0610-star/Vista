package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DestinationDetailDto(
    UUID id,
    String name,
    String province,
    String category,
    String imageUrl,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Double latitude,
    Double longitude,
    String status,
    String description,
    Map<String, Object> openingHours,
    String sourceUrl,
    Instant verifiedAt,
    boolean isFavorite) {}
