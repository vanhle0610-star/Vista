package com.vista.destination.application;

import java.math.BigDecimal;
import java.util.UUID;

public record DestinationSummary(
    UUID id,
    String name,
    String provinceName,
    String categoryName,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Double latitude,
    Double longitude,
    String imageUrl,
    String openingHours) {

  public DestinationSummary(
      UUID id,
      String name,
      String provinceName,
      String categoryName,
      BigDecimal priceMin,
      BigDecimal priceMax,
      Double latitude,
      Double longitude,
      String imageUrl) {
    this(id, name, provinceName, categoryName, priceMin, priceMax, latitude, longitude, imageUrl, null);
  }

  public DestinationSummary(
      UUID id,
      String name,
      String provinceName,
      String categoryName,
      BigDecimal priceMin,
      BigDecimal priceMax,
      Double latitude,
      Double longitude) {
    this(id, name, provinceName, categoryName, priceMin, priceMax, latitude, longitude, null, null);
  }
}
