package com.vista.trip.api.dto;

import com.vista.trip.domain.TripMemberEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TripMemberResponse(
    UUID userId,
    String displayName,
    String email,
    String role,
    String status,
    BigDecimal budgetShare,
    Instant joinedAt
) {
  /** Constructor tương thích ngược cho truy vấn thành viên thủ quỹ TV4. */
  public TripMemberResponse(
      UUID userId,
      String displayName,
      String email,
      String role,
      BigDecimal budgetShare) {
    this(userId, displayName, email, role, "ACTIVE", budgetShare, null);
  }

  /** Factory method trích xuất từ TripMemberEntity phục vụ TV3 Collaboration. */
  public static TripMemberResponse from(TripMemberEntity m) {
    return new TripMemberResponse(
        m.getUserId(),
        null,
        null,
        m.getRole() != null ? m.getRole().name() : null,
        m.getStatus() != null ? m.getStatus().name() : null,
        m.getBudgetShare(),
        m.getJoinedAt());
  }
}
