package com.vista.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserSummaryDto(
    UUID id,
    String email,
    String displayName,
    String phoneNumber,
    String avatarUrl,
    String status,
    List<String> roles,
    Instant createdAt,
    Instant updatedAt) {}
