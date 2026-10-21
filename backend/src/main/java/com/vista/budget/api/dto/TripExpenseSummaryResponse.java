package com.vista.budget.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TripExpenseSummaryResponse(
    UUID tripId,
    BigDecimal totalSpent,
    BigDecimal budgetTotal,
    BigDecimal remainingBudget,
    Integer spentPercentage,
    String currency,
    Map<UUID, BigDecimal> settlementDeltas,
    List<SettlementTransferResponse> suggestedTransfers) {}
