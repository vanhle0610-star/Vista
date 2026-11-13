package com.vista.admin.dto;

public record ImageCandidateDto(
    String imageUrl,
    String thumbnailUrl,
    String title,
    String sourceName,
    String sourcePageUrl,
    String license,
    int confidence,
    String matchReason,
    Integer width,
    Integer height) {}
