package com.vista.budget.api.dto;

import com.vista.budget.domain.PayoutVerificationStatus;
import java.time.Instant;
import java.util.UUID;

public record PayoutAccountResponse(
    UUID id,
    UUID userId,
    String bankCode,
    String maskedAccountNumber,
    String fullAccountNumber,
    String accountName,
    boolean isDefault,
    PayoutVerificationStatus verificationStatus,
    Instant createdAt,
    Instant updatedAt) {}
