package com.vista.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DestinationImageAuditItemDto(
    UUID destinationId,
    String name,
    String province,
    String category,
    String description,
    Double latitude,
    Double longitude,
    String destinationStatus,
    String currentImageUrl,
    int duplicateCount,
    String auditStatus,
    String issueReason,
    List<ImageCandidateDto> candidates,
    String selectedCandidateUrl,
    String selectedCandidateSource,
    String selectedCandidatePageUrl,
    String selectedCandidateLicense,
    Integer selectedCandidateConfidence,
    String previousImageUrl,
    String lastUpdatedBy,
    Instant lastUpdatedAt,
    String lastUpdateSource) {}
