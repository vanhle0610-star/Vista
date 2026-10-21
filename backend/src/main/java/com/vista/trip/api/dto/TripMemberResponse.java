package com.vista.trip.api.dto;

import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberRole;
import com.vista.trip.domain.TripMemberStatus;
import java.time.Instant;
import java.util.UUID;

public record TripMemberResponse(
    UUID userId,
    TripMemberRole role,
    TripMemberStatus status,
    Instant joinedAt
) {
  public static TripMemberResponse from(TripMemberEntity m) {
    return new TripMemberResponse(m.getUserId(), m.getRole(), m.getStatus(), m.getJoinedAt());
  }
}
