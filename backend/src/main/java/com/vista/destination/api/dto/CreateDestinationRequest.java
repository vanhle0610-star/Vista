package com.vista.destination.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.List;

public record CreateDestinationRequest(
    @NotBlank(message = "Tên điểm đến không được để trống") String name,
    @NotBlank(message = "Tỉnh thành không được để trống") String province,
    String category,
    String description,
    String imageUrl,
    List<String> imageUrls,
    BigDecimal latitude,
    BigDecimal longitude,
    BigDecimal priceMin,
    BigDecimal priceMax,
    String openingHours,
    @JsonAlias({"source", "source_url"}) String sourceUrl,
    String status) {

  public CreateDestinationRequest(
      String name,
      String province,
      String category,
      String description,
      String imageUrl,
      BigDecimal latitude,
      BigDecimal longitude,
      BigDecimal priceMin,
      BigDecimal priceMax,
      String openingHours,
      String sourceUrl,
      String status) {
    this(
        name,
        province,
        category,
        description,
        imageUrl,
        imageUrl != null && !imageUrl.isBlank() ? List.of(imageUrl) : List.of(),
        latitude,
        longitude,
        priceMin,
        priceMax,
        openingHours,
        sourceUrl,
        status);
  }
}
