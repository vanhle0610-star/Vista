package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SubmitDestinationRequestDto(
    String requestType,
    UUID targetDestinationId,
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
    String sourceUrl,
    String note) {}
