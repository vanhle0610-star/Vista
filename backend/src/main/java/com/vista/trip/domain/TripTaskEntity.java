package com.vista.trip.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip_tasks")
public class TripTaskEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "title", nullable = false, length = 255)
  private String title;

  @Column(name = "assignee_id")
  private UUID assigneeId;

  @Column(name = "is_completed", nullable = false)
  private boolean isCompleted = false;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected TripTaskEntity() {}

  public TripTaskEntity(UUID tripId, String title, UUID assigneeId) {
    this.id = UUID.randomUUID();
    this.tripId = tripId;
    this.title = title;
    this.assigneeId = assigneeId;
    this.isCompleted = false;
    this.createdAt = Instant.now();
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    if (this.createdAt == null) {
      this.createdAt = Instant.now();
    }
  }

  public UUID getId() {
    return id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public void setTripId(UUID tripId) {
    this.tripId = tripId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public UUID getAssigneeId() {
    return assigneeId;
  }

  public void setAssigneeId(UUID assigneeId) {
    this.assigneeId = assigneeId;
  }

  public boolean isCompleted() {
    return isCompleted;
  }

  public void setCompleted(boolean completed) {
    isCompleted = completed;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

