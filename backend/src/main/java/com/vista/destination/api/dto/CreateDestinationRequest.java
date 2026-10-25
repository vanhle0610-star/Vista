package com.vista.destination.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record CreateDestinationRequest(
    @NotBlank(message = "Tên điểm đến không được để trống") String name,
    @NotBlank(message = "Tỉnh thành không được để trống") String province,
    String category,
    String description,
    String imageUrl,
    BigDecimal latitude,
    BigDecimal longitude,
    BigDecimal priceMin,
    BigDecimal priceMax,
    String openingHours,
    String sourceUrl,
    String status) {}
