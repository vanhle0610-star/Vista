package com.vista.collaboration.itinerary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "itinerary_items")
public class ItineraryItem {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "itinerary_day_id", nullable = false)
  private ItineraryDay day;

  /** FK đến destinations — null nếu là điểm dừng tự nhập. */
  @Column(name = "destination_id")
  private UUID destinationId;

  /** Tên điểm dừng tự nhập (khi destinationId null). */
  @Column(name = "custom_stop_name", length = 200)
  private String customStopName;

  @Column(name = "start_time")
  private LocalTime startTime;

  @Column(name = "end_time")
  private LocalTime endTime;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder = 0;

  @Column(name = "note", columnDefinition = "TEXT")
  private String note;

  /** Nguồn tạo: MANUAL, AI_SUGGESTED. */
  @Column(name = "source", nullable = false, length = 30)
  private String source = "MANUAL";

  @Column(name = "updated_by")
  private UUID updatedBy;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private Long version;

  protected ItineraryItem() {}

  public ItineraryItem(
      ItineraryDay day,
      UUID destinationId,
      String customStopName,
      LocalTime startTime,
      LocalTime endTime,
      Integer sortOrder,
      String note,
      UUID updatedBy) {
    this.id = UUID.randomUUID();
    this.day = day;
    this.destinationId = destinationId;
    this.customStopName = customStopName;
    this.startTime = startTime;
    this.endTime = endTime;
    this.sortOrder = sortOrder != null ? sortOrder : 0;
    this.note = note;
    this.source = "MANUAL";
    this.updatedBy = updatedBy;
  }

  @PrePersist
  protected void onCreate() {
    if (this.id == null) this.id = UUID.randomUUID();
    if (this.updatedAt == null) this.updatedAt = Instant.now();
    if (this.sortOrder == null) this.sortOrder = 0;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = Instant.now();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  public UUID getId() {
    return id;
  }

  public ItineraryDay getDay() {
    return day;
  }

  public void setDay(ItineraryDay day) {
    this.day = day;
  }

  public UUID getDestinationId() {
    return destinationId;
  }

  public void setDestinationId(UUID destinationId) {
    this.destinationId = destinationId;
  }

  public String getCustomStopName() {
    return customStopName;
  }

  public void setCustomStopName(String customStopName) {
    this.customStopName = customStopName;
  }

  public LocalTime getStartTime() {
    return startTime;
  }

  public void setStartTime(LocalTime startTime) {
    this.startTime = startTime;
  }

  public LocalTime getEndTime() {
    return endTime;
  }

  public void setEndTime(LocalTime endTime) {
    this.endTime = endTime;
  }

  public Integer getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public UUID getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(UUID updatedBy) {
    this.updatedBy = updatedBy;
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
