package com.vista.collaboration.itinerary;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class CreateItineraryDayRequest {

  @NotNull(message = "Số thứ tự ngày không được để trống")
  @Min(value = 1, message = "Số thứ tự ngày phải >= 1")
  private Integer dayNumber;

  @NotNull(message = "Ngày lịch trình không được để trống")
  private LocalDate tripDate;

  public CreateItineraryDayRequest() {}

  public CreateItineraryDayRequest(Integer dayNumber, LocalDate tripDate) {
    this.dayNumber = dayNumber;
    this.tripDate = tripDate;
  }

  public Integer getDayNumber() { return dayNumber; }
  public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }

  public LocalDate getTripDate() { return tripDate; }
  public void setTripDate(LocalDate tripDate) { this.tripDate = tripDate; }
}
