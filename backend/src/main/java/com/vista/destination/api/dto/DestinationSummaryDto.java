package com.vista.destination.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DestinationSummaryDto(
    UUID id,
    String name,
    String province,
    String category,
    String imageUrl,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Double latitude,
    Double longitude,
    String status) {}
