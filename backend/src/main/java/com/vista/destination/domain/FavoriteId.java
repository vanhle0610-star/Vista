package com.vista.destination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class FavoriteId implements Serializable {

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "destination_id", nullable = false)
  private UUID destinationId;

  public FavoriteId() {}

  public FavoriteId(UUID userId, UUID destinationId) {
    this.userId = userId;
    this.destinationId = destinationId;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public UUID getDestinationId() {
    return destinationId;
  }

  public void setDestinationId(UUID destinationId) {
    this.destinationId = destinationId;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    FavoriteId that = (FavoriteId) o;
    return Objects.equals(userId, that.userId)
        && Objects.equals(destinationId, that.destinationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(userId, destinationId);
  }
}
