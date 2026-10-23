package com.vista.destination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "favorites")
public class Favorite {

  @EmbeddedId private FavoriteId id;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("destinationId")
  @JoinColumn(name = "destination_id", nullable = false)
  private Destination destination;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public Favorite() {}

  public Favorite(UUID userId, Destination destination) {
    this.id = new FavoriteId(userId, destination.getId());
    this.destination = destination;
    this.createdAt = Instant.now();
  }

  public FavoriteId getId() {
    return id;
  }

  public void setId(FavoriteId id) {
    this.id = id;
  }

  public Destination getDestination() {
    return destination;
  }

  public void setDestination(Destination destination) {
    this.destination = destination;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
