package com.vista.destination.api.dto;

import java.util.List;

public record DestinationRequestPageDto(
    List<DestinationRequestDto> items, int page, int size, long total) {}
