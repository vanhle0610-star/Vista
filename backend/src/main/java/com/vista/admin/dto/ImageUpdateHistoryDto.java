package com.vista.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record ImageUpdateHistoryDto(
    String id,
    UUID destinationId,
    String destinationName,
    String province,
    String action,
    String previousImageUrl,
    String newImageUrl,
    String sourceName,
    Integer confidence,
    String performedBy,
    Instant performedAt) {}
