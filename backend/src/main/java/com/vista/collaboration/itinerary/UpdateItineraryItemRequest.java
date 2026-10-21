package com.vista.collaboration.itinerary;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public class UpdateItineraryItemRequest {

  private UUID destinationId;
  private String customStopName;
  private LocalTime startTime;
  private LocalTime endTime;
  private Integer sortOrder;
  private String note;

  /**
   * Optimistic concurrency — client gửi updatedAt hiện tại của item.
   * Server từ chối nếu giá trị không khớp (tránh ghi đè bất đồng bộ).
   */
  @JsonProperty("expected_updated_at")
  private Instant expectedUpdatedAt;

  public UpdateItineraryItemRequest() {}

  public UUID getDestinationId() { return destinationId; }
  public void setDestinationId(UUID destinationId) { this.destinationId = destinationId; }

  public String getCustomStopName() { return customStopName; }
  public void setCustomStopName(String customStopName) { this.customStopName = customStopName; }

  public LocalTime getStartTime() { return startTime; }
  public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

  public LocalTime getEndTime() { return endTime; }
  public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }

  public Instant getExpectedUpdatedAt() { return expectedUpdatedAt; }
  public void setExpectedUpdatedAt(Instant expectedUpdatedAt) {
    this.expectedUpdatedAt = expectedUpdatedAt;
  }
}
