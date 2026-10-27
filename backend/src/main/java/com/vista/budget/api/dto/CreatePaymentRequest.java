package com.vista.budget.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreatePaymentRequest(
    @NotNull(message = "toUserId must not be null")
    UUID toUserId,

    @NotBlank(message = "idempotencyKey must not be blank")
    @Size(min = 8, max = 64, message = "idempotencyKey must be between 8 and 64 characters")
    String idempotencyKey,

    @Size(max = 50, message = "memo must not exceed 50 characters")
    String memo
) {}
