package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DestinationRequestDto(
    UUID id,
    String requestType,
    UUID targetDestinationId,
    String targetDestinationName,
    UUID submittedBy,
    String submittedByName,
    String name,
    String provinceName,
    String categoryName,
    String description,
    String address,
    Double latitude,
    Double longitude,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Map<String, Object> openingHours,
    List<String> imageUrls,
    String sourceUrl,
    String note,
    String status,
    String rejectionReason,
    UUID reviewedBy,
    String reviewedByName,
    Instant reviewedAt,
    Instant createdAt,
    Instant updatedAt,
    DestinationDetailDto currentDestination) {}
