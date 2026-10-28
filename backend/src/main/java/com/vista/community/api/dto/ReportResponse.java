package com.vista.community.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReportResponse(
    UUID id,
    UUID reporterId,
    String reporterName,
    String targetType,
    UUID targetId,
    String targetBody,
    List<String> targetMediaUrls,
    String targetAuthorName,
    long targetVersion,
    String reason,
    String status,
    UUID handledBy,
    Instant handledAt,
    Instant createdAt) {}
