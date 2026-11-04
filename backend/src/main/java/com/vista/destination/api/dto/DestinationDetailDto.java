package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DestinationDetailDto(
    UUID id,
    String name,
    String province,
    String category,
    String imageUrl,
    List<String> imageUrls,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Double latitude,
    Double longitude,
    String status,
    String description,
    Map<String, Object> openingHours,
    String sourceUrl,
    Instant verifiedAt,
    boolean isFavorite,
    Double rating,
    Integer reviewCount,
    String rejectionReason) {

  public DestinationDetailDto(
      UUID id,
      String name,
      String province,
      String category,
      String imageUrl,
      List<String> imageUrls,
      BigDecimal priceMin,
      BigDecimal priceMax,
      Double latitude,
      Double longitude,
      String status,
      String description,
      Map<String, Object> openingHours,
      String sourceUrl,
      Instant verifiedAt,
      boolean isFavorite,
      Double rating,
      Integer reviewCount) {
    this(
        id,
        name,
        province,
        category,
        imageUrl,
        imageUrls,
        priceMin,
        priceMax,
        latitude,
        longitude,
        status,
        description,
        openingHours,
        sourceUrl,
        verifiedAt,
        isFavorite,
        rating,
        reviewCount,
        null);
  }

  public DestinationDetailDto(
      UUID id,
      String name,
      String province,
      String category,
      String imageUrl,
      BigDecimal priceMin,
      BigDecimal priceMax,
      Double latitude,
      Double longitude,
      String status,
      String description,
      Map<String, Object> openingHours,
      String sourceUrl,
      Instant verifiedAt,
      boolean isFavorite,
      Double rating,
      Integer reviewCount) {
    this(
        id,
        name,
        province,
        category,
        imageUrl,
        imageUrl != null ? List.of(imageUrl) : List.of(),
        priceMin,
        priceMax,
        latitude,
        longitude,
        status,
        description,
        openingHours,
        sourceUrl,
        verifiedAt,
        isFavorite,
        rating,
        reviewCount,
        null);
  }

  public DestinationDetailDto(
      UUID id,
      String name,
      String province,
      String category,
      String imageUrl,
      BigDecimal priceMin,
      BigDecimal priceMax,
      Double latitude,
      Double longitude,
      String status,
      String description,
      Map<String, Object> openingHours,
      String sourceUrl,
      Instant verifiedAt,
      boolean isFavorite) {
    this(
        id,
        name,
        province,
        category,
        imageUrl,
        imageUrl != null ? List.of(imageUrl) : List.of(),
        priceMin,
        priceMax,
        latitude,
        longitude,
        status,
        description,
        openingHours,
        sourceUrl,
        verifiedAt,
        isFavorite,
        null,
        0,
        null);
  }
}
