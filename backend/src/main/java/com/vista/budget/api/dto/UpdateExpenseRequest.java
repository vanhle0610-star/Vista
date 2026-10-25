package com.vista.budget.api.dto;

import com.vista.budget.domain.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Fields omitted from a PATCH request retain their current value. */
public record UpdateExpenseRequest(
    @Size(min = 1, max = 200, message = "Title must contain between 1 and 200 characters") String title,
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be strictly positive") BigDecimal amount,
    @Size(min = 3, max = 3, message = "Currency must contain exactly 3 characters") String currency,
    UUID paidBy,
    ExpenseCategory category,
    Instant occurredAt,
    String splitType,
    List<UUID> participantIds,
    Map<UUID, BigDecimal> exactShares) {}
