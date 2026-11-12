package com.vista.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserDetailDto(
    UUID id,
    String email,
    String displayName,
    String phoneNumber,
    String avatarUrl,
    String bio,
    String status,
    List<String> roles,
    List<String> travelPreferences,
    String bankCode,
    String bankAccountNumber,
    String bankAccountName,
    Instant createdAt,
    Instant updatedAt) {}
