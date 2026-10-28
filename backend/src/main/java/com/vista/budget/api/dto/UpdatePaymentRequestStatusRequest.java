package com.vista.budget.api.dto;

import com.vista.budget.domain.PaymentRequestStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePaymentRequestStatusRequest(
    @NotNull(message = "status must not be null") PaymentRequestStatus status,
    Long version,
    String note) {}
