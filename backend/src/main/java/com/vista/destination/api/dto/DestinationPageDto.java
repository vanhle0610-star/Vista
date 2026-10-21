package com.vista.destination.api.dto;

import java.util.List;

public record DestinationPageDto(
    List<DestinationSummaryDto> items, int page, int size, long total) {}
