package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record ApproveDestinationRequestDto(
    String name,
    String provinceName,
    String categoryName,
    String description,
    String address,
    BigDecimal latitude,
    BigDecimal longitude,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Object openingHours,
    List<String> imageUrls,
    String sourceUrl) {}
