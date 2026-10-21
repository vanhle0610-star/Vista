package com.vista.budget.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SettlementTransferResponse(UUID fromUserId, UUID toUserId, BigDecimal amount) {}
