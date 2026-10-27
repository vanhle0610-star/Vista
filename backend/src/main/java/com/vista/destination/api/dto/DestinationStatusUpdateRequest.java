package com.vista.destination.api.dto;

import jakarta.validation.constraints.NotBlank;

public record DestinationStatusUpdateRequest(
    @NotBlank(message = "Trạng thái không được để trống (PUBLISHED, REJECTED, DRAFT)")
        String status,
    String note) {}
