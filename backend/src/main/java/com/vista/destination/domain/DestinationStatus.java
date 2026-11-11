package com.vista.destination.domain;

import java.util.Locale;

public enum DestinationStatus {
  DRAFT,
  PUBLISHED,
  REJECTED,
  ARCHIVED;

  public static DestinationStatus fromString(String value) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Trạng thái điểm đến không được để trống");
    }
    try {
      return DestinationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException(
          "Trạng thái không hợp lệ: "
              + value
              + ". Chỉ chấp nhận: DRAFT, PUBLISHED, REJECTED, ARCHIVED");
    }
  }
}
