package com.vista.admin.dto;

import java.util.Map;

public record AiImageStatsDto(
    long totalDestinations,
    long validImages,
    long missingImages,
    long suspiciousImages,
    long brokenImages,
    long pendingApproval,
    long updatedImages,
    long uncheckedImages,
    long noMatchFound,
    Map<String, Boolean> configuredProviders) {}
