package com.vista.trip.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class TripMemberId implements Serializable {

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  public TripMemberId() {}

  public TripMemberId(UUID tripId, UUID userId) {
    this.tripId = tripId;
    this.userId = userId;
  }

  public UUID getTripId() {
    return tripId;
  }

  public void setTripId(UUID tripId) {
    this.tripId = tripId;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    TripMemberId that = (TripMemberId) o;
    return Objects.equals(tripId, that.tripId) && Objects.equals(userId, that.userId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(tripId, userId);
  }
}
