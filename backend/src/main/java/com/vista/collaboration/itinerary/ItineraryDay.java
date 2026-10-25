package com.vista.collaboration.itinerary;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "itinerary_days",
    uniqueConstraints = {
      @UniqueConstraint(columnNames = {"trip_id", "day_number"}),
      @UniqueConstraint(columnNames = {"trip_id", "trip_date"})
    })
public class ItineraryDay {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "trip_id", nullable = false)
  private UUID tripId;

  @Column(name = "day_number", nullable = false)
  private Integer dayNumber;

  @Column(name = "trip_date", nullable = false)
  private LocalDate tripDate;

  @OneToMany(mappedBy = "day", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder ASC")
  private List<ItineraryItem> items = new ArrayList<>();

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version;

  protected ItineraryDay() {}

  public ItineraryDay(UUID tripId, Integer dayNumber, LocalDate tripDate) {
    this.id = UUID.randomUUID();
    this.tripId = tripId;
    this.dayNumber = dayNumber;
    this.tripDate = tripDate;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    var now = Instant.now();
    if (this.createdAt == null) this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = Instant.now();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() {
    return id;
  }

  public UUID getTripId() {
    return tripId;
  }

  public void setTripId(UUID tripId) {
    this.tripId = tripId;
  }

  public Integer getDayNumber() {
    return dayNumber;
  }

  public void setDayNumber(Integer dayNumber) {
    this.dayNumber = dayNumber;
  }

  public LocalDate getTripDate() {
    return tripDate;
  }

  public void setTripDate(LocalDate tripDate) {
    this.tripDate = tripDate;
  }

  public List<ItineraryItem> getItems() {
    return items;
  }

  public void addItem(ItineraryItem item) {
    items.add(item);
    item.setDay(this);
  }

  public void removeItem(ItineraryItem item) {
    items.remove(item);
    item.setDay(null);
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  public Long getVersion() {
    return version;
  }
}
