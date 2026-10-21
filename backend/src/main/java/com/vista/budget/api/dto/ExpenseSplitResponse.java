package com.vista.budget.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ExpenseSplitResponse(
    UUID id, UUID userId, BigDecimal shareAmount, String settledStatus) {}
