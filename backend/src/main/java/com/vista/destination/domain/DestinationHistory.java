package com.vista.destination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "destination_history",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uq_destination_history_user_dest",
          columnNames = {"user_id", "destination_id"})
    })
public class DestinationHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "destination_id", nullable = false)
  private Destination destination;

  @Column(name = "viewed_at", nullable = false)
  private Instant viewedAt = Instant.now();

  public DestinationHistory() {}

  public DestinationHistory(UUID userId, Destination destination) {
    this.userId = userId;
    this.destination = destination;
    this.viewedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public Destination getDestination() {
    return destination;
  }

  public void setDestination(Destination destination) {
    this.destination = destination;
  }

  public Instant getViewedAt() {
    return viewedAt;
  }

  public void setViewedAt(Instant viewedAt) {
    this.viewedAt = viewedAt;
  }
}
