package com.vista.collaboration.itinerary;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.UUID;

/**
 * W5-TV3-04: DTO tiếp nhận gợi ý AI từ TV4 để thêm vào lịch trình.
 * Yêu cầu cờ xác nhận 'confirmed = true' mới được lưu vào DB.
 */
public class CreateAiItineraryItemRequest {

  @NotNull(message = "ID ngày lịch trình (dayId) không được để trống")
  private UUID dayId;

  private UUID destinationId;
  private String customStopName;
  private LocalTime startTime;
  private LocalTime endTime;
  private Integer sortOrder = 0;
  private String note;

  /** Cờ xác nhận từ người dùng — bắt buộc true để lưu bản ghi */
  private Boolean confirmed;

  public CreateAiItineraryItemRequest() {}

  public CreateAiItineraryItemRequest(
      UUID dayId,
      UUID destinationId,
      String customStopName,
      LocalTime startTime,
      LocalTime endTime,
      Integer sortOrder,
      String note,
      Boolean confirmed) {
    this.dayId = dayId;
    this.destinationId = destinationId;
    this.customStopName = customStopName;
    this.startTime = startTime;
    this.endTime = endTime;
    this.sortOrder = sortOrder != null ? sortOrder : 0;
    this.note = note;
    this.confirmed = confirmed;
  }

  @AssertTrue(message = "Phải cung cấp destinationId hoặc customStopName")
  public boolean isDestinationOrCustomStop() {
    return destinationId != null || (customStopName != null && !customStopName.isBlank());
  }

  public UUID getDayId() {
    return dayId;
  }

  public void setDayId(UUID dayId) {
    this.dayId = dayId;
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

  public Boolean getConfirmed() {
    return confirmed;
  }

  public void setConfirmed(Boolean confirmed) {
    this.confirmed = confirmed;
  }
}

