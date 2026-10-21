package com.vista.budget.api.dto;

import com.vista.budget.domain.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CreateExpenseRequest(
    @NotBlank(message = "Title must not be blank") @Size(max = 200, message = "Title must not exceed 200 characters") String title,
    @NotNull(message = "Amount is required") @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be strictly positive") BigDecimal amount,
    String currency,
    UUID paidBy,
    ExpenseCategory category,
    Instant occurredAt,
    String splitType,
    List<UUID> participantIds,
    Map<UUID, BigDecimal> exactShares) {}
