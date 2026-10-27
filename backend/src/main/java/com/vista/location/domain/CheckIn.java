package com.vista.location.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "checkins")
public class CheckIn {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "itinerary_item_id")
  private UUID itineraryItemId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "checked_in_at", nullable = false, updatable = false)
  private Instant checkedInAt;

  @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
  private BigDecimal latitude;

  @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
  private BigDecimal longitude;

  public CheckIn() {}

  public CheckIn(
      UUID tripId, UUID itineraryItemId, UUID userId, BigDecimal latitude, BigDecimal longitude) {
    this.tripId = tripId;
    this.itineraryItemId = itineraryItemId;
    this.userId = userId;
    this.latitude = latitude;
    this.longitude = longitude;
  }

  @PrePersist
  protected void onCreate() {
    if (this.checkedInAt == null) {
      this.checkedInAt = Instant.now();
    }
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public void setTripId(UUID tripId) {
    this.tripId = tripId;
  }

  public UUID getItineraryItemId() {
    return itineraryItemId;
  }

  public void setItineraryItemId(UUID itineraryItemId) {
    this.itineraryItemId = itineraryItemId;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public Instant getCheckedInAt() {
    return checkedInAt;
  }

  public void setCheckedInAt(Instant checkedInAt) {
    this.checkedInAt = checkedInAt;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public void setLatitude(BigDecimal latitude) {
    this.latitude = latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }

  public void setLongitude(BigDecimal longitude) {
    this.longitude = longitude;
  }
}
