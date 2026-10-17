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
    Double longitude) {}
