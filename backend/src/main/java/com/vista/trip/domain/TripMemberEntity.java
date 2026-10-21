package com.vista.trip.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "trip_members")
@IdClass(TripMemberEntity.TripMemberId.class)
public class TripMemberEntity {

  /** Composite PK class — khớp với PRIMARY KEY (trip_id, user_id) trong DB. */
  public static class TripMemberId implements Serializable {
    private UUID trip;
    private UUID userId;

    public TripMemberId() {}

    public TripMemberId(UUID trip, UUID userId) {
      this.trip = trip;
      this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof TripMemberId that)) return false;
      return Objects.equals(trip, that.trip) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(trip, userId);
    }
  }

  @Id
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "trip_id", nullable = false)
  private TripEntity trip;

  @Id
  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "role", nullable = false, length = 20)
  private TripMemberRole role = TripMemberRole.VIEWER;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private TripMemberStatus status = TripMemberStatus.ACTIVE;

  @Column(name = "joined_at")
  private Instant joinedAt;

  @Column(name = "budget_share", precision = 15, scale = 2)
  private BigDecimal budgetShare;

  protected TripMemberEntity() {}

  public TripMemberEntity(TripEntity trip, UUID userId, TripMemberRole role) {
    this.trip = trip;
    this.userId = userId;
    this.role = role;
    this.status = TripMemberStatus.ACTIVE;
    this.joinedAt = Instant.now();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public TripEntity getTrip() { return trip; }
  public void setTrip(TripEntity trip) { this.trip = trip; }

  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }

  public TripMemberRole getRole() { return role; }
  public void setRole(TripMemberRole role) { this.role = role; }

  public TripMemberStatus getStatus() { return status; }
  public void setStatus(TripMemberStatus status) { this.status = status; }

  public Instant getJoinedAt() { return joinedAt; }
  public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

  public BigDecimal getBudgetShare() { return budgetShare; }
  public void setBudgetShare(BigDecimal budgetShare) { this.budgetShare = budgetShare; }
}
