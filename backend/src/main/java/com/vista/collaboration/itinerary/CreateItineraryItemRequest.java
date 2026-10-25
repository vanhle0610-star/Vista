package com.vista.collaboration.itinerary;

import jakarta.validation.constraints.AssertTrue;
import java.time.LocalTime;
import java.util.UUID;

public class CreateItineraryItemRequest {

  /** FK đến destinations. Null nếu dùng customStopName. */
  private UUID destinationId;

  /** Tên điểm dừng tự nhập. Null nếu dùng destinationId. */
  private String customStopName;

  private LocalTime startTime;
  private LocalTime endTime;
  private Integer sortOrder = 0;
  private String note;

  public CreateItineraryItemRequest() {}

  @AssertTrue(message = "Phải cung cấp destinationId hoặc customStopName") public boolean isDestinationOrCustomStop() {
    return destinationId != null || (customStopName != null && !customStopName.isBlank());
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
}
