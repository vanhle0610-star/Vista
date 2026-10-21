package com.vista.trip.api.dto;

import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripStatus;
import com.vista.trip.domain.TripVisibility;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TripResponse(
    UUID id,
    UUID ownerId,
    String title,
    LocalDate startDate,
    LocalDate endDate,
    String destinationSummary,
    BigDecimal budgetTotal,
    String currency,
    TripStatus status,
    TripVisibility visibility,
    List<TripMemberResponse> members,
    Instant createdAt,
    Instant updatedAt
) {
  public static TripResponse from(TripEntity t) {
    List<TripMemberResponse> memberList = t.getMembers().stream()
        .map(TripMemberResponse::from)
        .toList();
    return new TripResponse(
        t.getId(), t.getOwnerId(), t.getTitle(),
        t.getStartDate(), t.getEndDate(), t.getDestinationSummary(),
        t.getBudgetTotal(), t.getCurrency(),
        t.getStatus(), t.getVisibility(),
        memberList, t.getCreatedAt(), t.getUpdatedAt());
  }
}
