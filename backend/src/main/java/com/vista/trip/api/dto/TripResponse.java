package com.vista.trip.api.dto;

import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripStatus;
import com.vista.trip.domain.TripVisibility;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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
    Instant updatedAt) {

  private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  public static TripResponse from(TripEntity t) {
    return from(t, LocalDate.now(VIETNAM_ZONE));
  }

  public static TripResponse from(TripEntity t, LocalDate today) {
    List<TripMemberResponse> memberList =
        t.getMembers().stream().map(TripMemberResponse::from).toList();
    TripStatus effectiveStatus = resolveEffectiveStatus(t.getStatus(), t.getStartDate(), t.getEndDate(), today);
    return new TripResponse(
        t.getId(),
        t.getOwnerId(),
        t.getTitle(),
        t.getStartDate(),
        t.getEndDate(),
        t.getDestinationSummary(),
        t.getBudgetTotal(),
        t.getCurrency(),
        effectiveStatus,
        t.getVisibility(),
        memberList,
        t.getCreatedAt(),
        t.getUpdatedAt());
  }

  public static TripStatus resolveEffectiveStatus(
      TripStatus rawStatus, LocalDate startDate, LocalDate endDate, LocalDate today) {
    if (rawStatus == TripStatus.CANCELLED) {
      return TripStatus.CANCELLED;
    }
    if (startDate != null && endDate != null && today != null) {
      if (today.isBefore(startDate)) {
        return TripStatus.PLANNING;
      }
      if (!today.isAfter(endDate)) {
        return TripStatus.ACTIVE;
      }
      return TripStatus.COMPLETED;
    }
    return rawStatus != null ? rawStatus : TripStatus.PLANNING;
  }
}
