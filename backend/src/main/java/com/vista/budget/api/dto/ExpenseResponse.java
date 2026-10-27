package com.vista.budget.api.dto;

import com.vista.budget.domain.ExpenseCategory;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
    UUID id,
    UUID tripId,
    String title,
    BigDecimal amount,
    String currency,
    UUID paidBy,
    ExpenseCategory category,
    Instant occurredAt,
    String status,
    Instant createdAt,
    List<ExpenseSplitResponse> splits,
    Long version) {

  public ExpenseResponse(
      UUID id,
      UUID tripId,
      String title,
      BigDecimal amount,
      String currency,
      UUID paidBy,
      ExpenseCategory category,
      Instant occurredAt,
      String status,
      Instant createdAt,
      List<ExpenseSplitResponse> splits) {
    this(id, tripId, title, amount, currency, paidBy, category, occurredAt, status, createdAt, splits, 0L);
  }
}
