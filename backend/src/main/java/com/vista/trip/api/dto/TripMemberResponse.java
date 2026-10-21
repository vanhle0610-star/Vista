package com.vista.trip.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TripMemberResponse(
    UUID userId,
    String displayName,
    String email,
    String role,
    BigDecimal budgetShare) {}
