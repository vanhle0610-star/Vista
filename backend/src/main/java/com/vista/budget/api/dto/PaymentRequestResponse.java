package com.vista.budget.api.dto;

import com.vista.budget.domain.PaymentRequestStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRequestResponse(
    UUID id,
    UUID tripId,
    UUID payerId,
    String payerName,
    UUID recipientId,
    String recipientName,
    BigDecimal amount,
    String currency,
    String memo,
    String qrContent,
    String qrImageUrl,
    String bankCode,
    String maskedAccountNumber,
    String recipientAccountName,
    String idempotencyKey,
    PaymentRequestStatus status,
    Instant expiresAt,
    Instant createdAt,
    Instant updatedAt,
    Long version) {}
