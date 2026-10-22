package com.vista.trip.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "trips")
public class TripEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Column(name = "title", nullable = false, length = 200)
  private String title;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  private LocalDate endDate;

  @Column(name = "destination_summary", columnDefinition = "TEXT")
  private String destinationSummary;

  @Column(name = "budget_total", precision = 15, scale = 2)
  private BigDecimal budgetTotal;

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "VND";

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 30)
  private TripStatus status = TripStatus.PLANNING;

  @Enumerated(EnumType.STRING)
  @Column(name = "visibility", nullable = false, length = 30)
  private TripVisibility visibility = TripVisibility.PRIVATE;

  @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<TripMemberEntity> members = new ArrayList<>();

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version;

  protected TripEntity() {
  }

  public TripEntity(UUID ownerId, String title, LocalDate startDate, LocalDate endDate) {
    this.id = UUID.randomUUID();
    this.ownerId = ownerId;
    this.title = title;
    this.startDate = startDate;
    this.endDate = endDate;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    var now = Instant.now();
    if (this.createdAt == null) {
      this.createdAt = now;
    }
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

  public UUID getOwnerId() {
    return ownerId;
  }

  public void setOwnerId(UUID ownerId) {
    this.ownerId = ownerId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public void setStartDate(LocalDate startDate) {
    this.startDate = startDate;
  }

  public LocalDate getEndDate() {
    return endDate;
  }

  public void setEndDate(LocalDate endDate) {
    this.endDate = endDate;
  }

  public String getDestinationSummary() {
    return destinationSummary;
  }

  public void setDestinationSummary(String destinationSummary) {
    this.destinationSummary = destinationSummary;
  }

  public BigDecimal getBudgetTotal() {
    return budgetTotal;
  }

  public void setBudgetTotal(BigDecimal budgetTotal) {
    this.budgetTotal = budgetTotal;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public TripStatus getStatus() {
    return status;
  }

  public void setStatus(TripStatus status) {
    this.status = status;
  }

  public TripVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(TripVisibility visibility) {
    this.visibility = visibility;
  }

  public List<TripMemberEntity> getMembers() {
    return members;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Long getVersion() {
    return version;
  }
}
