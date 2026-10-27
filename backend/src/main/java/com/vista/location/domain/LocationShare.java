package com.vista.location.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "location_shares",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"trip_id", "user_id"})})
public class LocationShare {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "enabled", nullable = false)
  private boolean enabled;

  @Column(name = "started_at", nullable = false)
  private Instant startedAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "stopped_at")
  private Instant stoppedAt;

  @Column(name = "last_latitude", precision = 9, scale = 6)
  private BigDecimal lastLatitude;

  @Column(name = "last_longitude", precision = 9, scale = 6)
  private BigDecimal lastLongitude;

  @Column(name = "last_updated_at")
  private Instant lastUpdatedAt;

  @Column(name = "session_id")
  private UUID sessionId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public LocationShare() {}

  public LocationShare(
      UUID tripId,
      UUID userId,
      boolean enabled,
      Instant startedAt,
      Instant expiresAt,
      BigDecimal lastLatitude,
      BigDecimal lastLongitude,
      Instant lastUpdatedAt) {
    this.tripId = tripId;
    this.userId = userId;
    this.enabled = enabled;
    this.startedAt = startedAt;
    this.expiresAt = expiresAt;
    this.lastLatitude = lastLatitude;
    this.lastLongitude = lastLongitude;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  @PrePersist
  protected void onCreate() {
    if (this.createdAt == null) {
      this.createdAt = Instant.now();
    }
    if (this.startedAt == null) {
      this.startedAt = Instant.now();
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

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Instant getStartedAt() {
    return startedAt;
  }

  public void setStartedAt(Instant startedAt) {
    this.startedAt = startedAt;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public Instant getStoppedAt() {
    return stoppedAt;
  }

  public void setStoppedAt(Instant stoppedAt) {
    this.stoppedAt = stoppedAt;
  }

  public BigDecimal getLastLatitude() {
    return lastLatitude;
  }

  public void setLastLatitude(BigDecimal lastLatitude) {
    this.lastLatitude = lastLatitude;
  }

  public BigDecimal getLastLongitude() {
    return lastLongitude;
  }

  public void setLastLongitude(BigDecimal lastLongitude) {
    this.lastLongitude = lastLongitude;
  }

  public Instant getLastUpdatedAt() {
    return lastUpdatedAt;
  }

  public void setLastUpdatedAt(Instant lastUpdatedAt) {
    this.lastUpdatedAt = lastUpdatedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public UUID getSessionId() {
    return sessionId;
  }

  public void setSessionId(UUID sessionId) {
    this.sessionId = sessionId;
  }
}
